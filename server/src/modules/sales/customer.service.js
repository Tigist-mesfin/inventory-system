const { Op } = require("sequelize");
const models = require("../../database/models");
const decimal = require("../../shared/helpers/decimal.helper");
const phoneNormalize = require("../../shared/helpers/phoneNormalize.helper");
const customerRepository = require("./customer.repository");
const tenant = require("../../shared/helpers/tenant.helper");
const supplierService = require("../catalog/supplier/supplier.service");
const supplierPaymentService = require("../purchasing/supplier-payment.service");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const sequelize = require("../../config/db");

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const resolvePhone = (phone) => {
  const raw = String(phone || "").trim();
  if (!raw) return null;
  return phoneNormalize(raw) || raw;
};

const assertPhoneAvailable = async (phoneRaw, user, { excludeId, transaction } = {}) => {
  const phone = resolvePhone(phoneRaw);
  if (!phone) throw AppError.badRequest("A valid phone number is required");
  const existing = await customerRepository.findByPhone(
    phone,
    tenant.companyIdOf(user),
    { excludeId, transaction },
  );
  if (existing) {
    throw AppError.conflict(
      "This phone number is already registered. Use a different phone.",
    );
  }
  return phone;
};

const withBalances = async (customer) => {
  const extras = await customerRepository.debtAndHistory(customer);
  return customerRepository.toPublic(customer, extras);
};

/** Fast list for sale/order pickers — no debt aggregation. */
exports.listForPicker = async (query, user) => {
  const { page, limit, offset } = paginate(query, {
    defaultLimit: 200,
    maxLimit: 500,
  });
  const where = customerRepository.searchWhere({
    ...query,
    type: query.type || "CUSTOMER",
    status: query.status || "ACTIVE",
  });
  tenant.applyCompany(where, user);
  const { rows, count } = await customerRepository.findAndCount({
    where,
    limit,
    offset,
  });
  const customers = rows.map((row) => customerRepository.toPublic(row));
  return paginate.buildResult("customers", customers, count, page, limit);
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query, {
    defaultLimit: 50,
    maxLimit: 500,
  });
  const where = customerRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  const { rows, count } = await customerRepository.findAndCount({
    where,
    limit,
    offset,
  });
  const customers = [];
  for (const row of rows) {
    try {
      customers.push(await withBalances(row));
    } catch {
      customers.push(customerRepository.toPublic(row));
    }
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
  const walletTransactions = await customerRepository.listWalletTransactions(id);
  return { ...publicCustomer, prices, payments, walletTransactions };
};

exports.create = async (payload, user) => {
  const userId = user.id;
  const type = payload.type || "CUSTOMER";
  return sequelize.transaction(async (transaction) => {
    const phone = await assertPhoneAvailable(payload.phone, user, { transaction });
    let supplierId = null;
    if (type === "SUPPLIER") {
      const supplier = await supplierService.create(
        {
          name: payload.name,
          phone,
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
        phone,
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

exports.update = async (id, payload, user) => {
  const customer = await customerRepository.findById(id);
  tenant.assertOwned(user, customer, "Customer not found");
  return sequelize.transaction(async (transaction) => {
    if (payload.name !== undefined) customer.name = payload.name;
    if (payload.phone !== undefined) {
      customer.phone = await assertPhoneAvailable(payload.phone, user, {
        excludeId: id,
        transaction,
      });
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
    if (payload.type !== undefined && payload.type !== customer.type) {
      throw AppError.badRequest("Customer / supplier type cannot be changed");
    }
    const saved = await customerRepository.save(customer, transaction);
    if (saved.supplierId) {
      await supplierService.update(
        saved.supplierId,
        {
          name: saved.name,
          phone: saved.phone,
          address: saved.location ? { line: saved.location } : null,
          status: saved.status,
        },
        user,
      );
    }
    return withBalances(saved);
  });
};

exports.remove = async (id, user) => {
  const customer = await customerRepository.findById(id);
  tenant.assertOwned(user, customer, "Customer not found");
  const sales = await customerRepository.countSales(id);
  if (sales > 0) {
    throw AppError.conflict(
      "This record has sales history and cannot be deleted; deactivate instead",
    );
  }
  const purchases = await customerRepository.countPurchaseOrders(customer.supplierId);
  if (purchases > 0) {
    throw AppError.conflict(
      "This supplier has purchase history and cannot be deleted; deactivate instead",
    );
  }
  await customerRepository.destroy(customer);
  return { deleted: true };
};

exports.setPrices = async (id, prices, user) => {
  const customer = await customerRepository.findById(id);
  tenant.assertOwned(user, customer, "Customer not found");
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

const isWalletPay = (value) =>
  String(value || "").trim().toUpperCase() === "WALLET";

exports.isWalletPay = isWalletPay;

exports.listWallets = async (user) => {
  const where = { type: "CUSTOMER" };
  tenant.applyCompany(where, user);
  const { rows } = await customerRepository.findAndCount({
    where,
    limit: 500,
    offset: 0,
  });
  const customers = [];
  for (const row of rows) {
    customers.push(await withBalances(row));
  }
  customers.sort(
    (a, b) => Number(b.walletBalance || 0) - Number(a.walletBalance || 0),
  );
  return { customers };
};

exports.listWalletTransactions = async (query, user) => {
  const { page, limit, offset } = paginate(query, { defaultLimit: 50, maxLimit: 200 });
  const where = customerRepository.walletSearchWhere(query);
  tenant.applyCompany(where, user);
  await customerRepository.applyWalletTextSearch(
    where,
    query.search,
    tenant.companyIdOf(user),
  );
  const { rows, count } = await customerRepository.findWalletTransactions({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("transactions", rows, count, page, limit);
};

exports.rechargeWallet = async (id, payload, user) => {
  const amount = decimal.money(payload.amount);
  return sequelize.transaction(async (transaction) => {
    const customer = await customerRepository.findByIdForUpdate(id, transaction);
    tenant.assertOwned(user, customer, "Customer not found");
    if (customer.type !== "CUSTOMER") {
      throw AppError.badRequest("Only customers have a wallet");
    }
    customer.walletBalance = decimal.addMoney(customer.walletBalance || 0, amount);
    await customer.save({ transaction });
    const tx = await customerRepository.createWalletTransaction(
      {
        companyId: customer.companyId,
        customerId: customer.id,
        saleId: null,
        recordedBy: user.id,
        type: "DEPOSIT",
        amount,
        method: String(payload.method).trim(),
        reason: emptyToNull(payload.reason) ?? null,
        occurredAt: payload.paidAt || new Date(),
      },
      transaction,
    );
    return {
      customer: await withBalances(customer),
      transaction: customerRepository.toWalletPublic(tx),
    };
  });
};

exports.deductWalletForSale = async (
  { customerId, amount, saleId, userId, companyId },
  transaction,
) => {
  const paid = decimal.money(amount);
  if (decimal.cmpMoney(paid, 0) <= 0) return null;
  const customer = await customerRepository.findByIdForUpdate(customerId, transaction);
  if (!customer) throw AppError.badRequest("Wallet payment needs a registered customer");
  if (customer.type !== "CUSTOMER") {
    throw AppError.badRequest("Only customers have a wallet");
  }
  if (decimal.cmpMoney(customer.walletBalance || 0, paid) < 0) {
    throw AppError.badRequest(
      `Not enough wallet balance. Available ${customer.walletBalance} ETB`,
    );
  }
  customer.walletBalance = decimal.subMoney(customer.walletBalance || 0, paid);
  await customer.save({ transaction });
  return customerRepository.createWalletTransaction(
    {
      companyId: companyId || customer.companyId,
      customerId: customer.id,
      saleId,
      recordedBy: userId,
      type: "SALE",
      amount: paid,
      method: "WALLET",
      reason: "Sale deducted from wallet",
      occurredAt: new Date(),
    },
    transaction,
  );
};

exports.refundWalletForSale = async ({ saleId, userId }, transaction) => {
  const rows = await customerRepository.findSaleWalletDebits(saleId, transaction);
  for (const row of rows) {
    const customer = await customerRepository.findByIdForUpdate(
      row.customerId,
      transaction,
    );
    if (!customer) continue;
    const amount = decimal.money(row.amount);
    customer.walletBalance = decimal.addMoney(customer.walletBalance || 0, amount);
    await customer.save({ transaction });
    await customerRepository.createWalletTransaction(
      {
        companyId: customer.companyId,
        customerId: customer.id,
        saleId,
        recordedBy: userId || row.recordedBy,
        type: "REFUND",
        amount,
        method: "WALLET",
        reason: "Sale cancelled — wallet refunded",
        occurredAt: new Date(),
      },
      transaction,
    );
  }
};
