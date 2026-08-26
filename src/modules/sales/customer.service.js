const sequelize = require("../../config/db");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const phoneNormalize = require("../../shared/helpers/phoneNormalize.helper");
const customerRepository = require("./customer.repository");
const tenant = require("../../shared/helpers/tenant.helper");
const supplierService = require("../catalog/supplier/supplier.service");
const supplierPaymentService = require("../purchasing/supplier-payment.service");

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const withBalances = async (customer) => {
  const extras = await customerRepository.debtAndHistory(customer);
  return customerRepository.toPublic(customer, extras);
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = customerRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  const { rows, count } = await customerRepository.findAndCount({
    where,
    limit,
    offset,
  });
  const customers = [];
  for (const row of rows) {
    customers.push(await withBalances(row));
  }

  let filtered = customers;
  if (query.followUpDays) {
    const cutoff = Date.now() - Number(query.followUpDays) * 24 * 60 * 60 * 1000;
    filtered = customers.filter((c) => {
      if (!c.lastPurchaseAt) return true;
      return new Date(c.lastPurchaseAt).getTime() < cutoff;
    });
  }

  return paginate.buildResult(
    "customers",
    filtered,
    query.followUpDays ? filtered.length : count,
    page,
    limit,
  );
};

exports.getById = async (id, user) => {
  const customer = await customerRepository.findById(id);
  tenant.assertOwned(user, customer, "Customer not found");
  const publicCustomer = await withBalances(customer);
  const prices = await customerRepository.listPrices(id);
  const payments = await customerRepository.listPayments(id);
  return { ...publicCustomer, prices, payments };
};

exports.create = async (payload, user) => {
  const userId = user.id;
  const type = payload.type || "CUSTOMER";
  return sequelize.transaction(async (transaction) => {
    let supplierId = null;
    if (type === "SUPPLIER") {
      const supplier = await supplierService.create(
        {
          name: payload.name,
          phone: payload.phone,
          address: payload.location ? { line: payload.location } : null,
          status: payload.status || "ACTIVE",
        },
        transaction,
        user,
      );
      supplierId = supplier.id;
    }
    const customer = await customerRepository.create(
      {
        createdBy: userId,
        companyId: tenant.companyIdOf(user),
        name: payload.name,
        phone: phoneNormalize(payload.phone) || payload.phone,
        businessName: emptyToNull(payload.businessName) ?? null,
        location: emptyToNull(payload.location) ?? null,
        creditLimit: payload.creditLimit ?? 0,
        notes: emptyToNull(payload.notes) ?? null,
        status: payload.status || "ACTIVE",
        type,
        supplierId,
      },
      transaction,
    );
    return withBalances(customer);
  });
};

exports.update = async (id, payload) => {
  const customer = await customerRepository.findById(id);
  if (!customer) throw AppError.notFound("Customer not found");
  if (payload.name !== undefined) customer.name = payload.name;
  if (payload.phone !== undefined) {
    customer.phone = phoneNormalize(payload.phone) || payload.phone;
  }
  if (payload.businessName !== undefined) {
    customer.businessName = emptyToNull(payload.businessName);
  }
  if (payload.location !== undefined) {
    customer.location = emptyToNull(payload.location);
  }
  if (payload.creditLimit !== undefined) {
    customer.creditLimit = payload.creditLimit;
  }
  if (payload.notes !== undefined) customer.notes = emptyToNull(payload.notes);
  if (payload.status !== undefined) customer.status = payload.status;
  const saved = await customerRepository.save(customer);
  return withBalances(saved);
};

exports.remove = async (id) => {
  const customer = await customerRepository.findById(id);
  if (!customer) throw AppError.notFound("Customer not found");
  const sales = await customerRepository.countSales(id);
  if (sales > 0) {
    throw AppError.conflict(
      "Customer has sales history and cannot be deleted; deactivate instead",
    );
  }
  await customerRepository.destroy(customer);
  return { deleted: true };
};

exports.setPrices = async (id, prices) => {
  const customer = await customerRepository.findById(id);
  if (!customer) throw AppError.notFound("Customer not found");
  return sequelize.transaction(async (transaction) =>
    customerRepository.replacePrices(id, prices, transaction),
  );
};

exports.recordPayment = async (id, payload, user) => {
  const userId = user.id;
  const customer = await customerRepository.findById(id);
  tenant.assertOwned(user, customer, "Customer not found");

  if (customer.type === "SUPPLIER") {
    if (!customer.supplierId) {
      throw AppError.badRequest("This supplier record is not linked for payments");
    }
    return supplierPaymentService.create(
      {
        supplierId: customer.supplierId,
        amount: payload.amount,
        method: payload.method,
        paidAt: payload.paidAt,
        notes: payload.notes,
      },
      user,
    );
  }

  return sequelize.transaction(async (transaction) => {
    let remaining = decimal.money(payload.amount);
    const applyToSale = async (sale) => {
      const open = decimal.subMoney(sale.totalAmount, sale.paidAmount);
      if (decimal.cmpMoney(open, 0) <= 0) return;
      const apply =
        decimal.cmpMoney(remaining, open) > 0 ? open : remaining;
      sale.paidAmount = decimal.addMoney(sale.paidAmount, apply);
      await sale.save({ transaction });
      remaining = decimal.subMoney(remaining, apply);
    };

    if (payload.saleId) {
      const sale = await customerRepository.findCreditSaleForUpdate(
        payload.saleId,
        id,
        transaction,
      );
      if (!sale) throw AppError.badRequest("Sale not found for this customer");
      await applyToSale(sale);
      if (decimal.cmpMoney(remaining, 0) > 0) {
        throw AppError.badRequest("Payment exceeds remaining balance on this sale");
      }
    } else {
      const sales = await customerRepository.findOldestOpenCreditSales(
        id,
        transaction,
      );
      for (const sale of sales) {
        if (decimal.cmpMoney(remaining, 0) <= 0) break;
        await applyToSale(sale);
      }
      if (decimal.cmpMoney(remaining, 0) > 0) {
        throw AppError.badRequest("Payment exceeds outstanding customer debt");
      }
    }

    const payment = await customerRepository.createPayment(
      {
        customerId: id,
        saleId: payload.saleId || null,
        recordedBy: userId,
        companyId: customer.companyId,
        amount: decimal.money(payload.amount),
        method: payload.method,
        paidAt: payload.paidAt || new Date(),
        notes: emptyToNull(payload.notes) ?? null,
      },
      transaction,
    );
    return payment.toJSON();
  });
};
