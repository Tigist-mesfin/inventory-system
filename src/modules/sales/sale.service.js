const sequelize = require("../../config/db");
const { Op } = require("sequelize");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const { nextDocumentNumber } = require("../../shared/helpers/documentNumber.helper");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const models = require("../../database/models");
const saleRepository = require("./sale.repository");
const tenant = require("../../shared/helpers/tenant.helper");

const { Product, Warehouse, Customer, CustomerPrice } = models;

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const uniqueProductIds = (items) => {
  const ids = items.map((item) => item.productId);
  if (new Set(ids).size !== ids.length) {
    throw AppError.badRequest("Duplicate products are not allowed on a sale");
  }
};

const assertWarehouse = async (warehouseId, user) => {
  const warehouse = await Warehouse.findByPk(warehouseId);
  tenant.assertOwned(user, warehouse, "Warehouse not found");
  if (warehouse.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot sell from an inactive warehouse");
  }
  return warehouse;
};

const assertCustomer = async (customerId, user) => {
  if (!customerId) return null;
  const customer = await Customer.findByPk(customerId);
  tenant.assertOwned(user, customer, "Customer not found");
  if (customer.type === "SUPPLIER") {
    throw AppError.badRequest("Cannot sell to a supplier; choose a customer");
  }
  if (customer.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot sell to an inactive customer");
  }
  return customer;
};

const resolveUnitPrice = async (product, customerId, quantity) => {
  if (!customerId) return decimal.money(product.sellingPrice);
  const tiers = await CustomerPrice.findAll({
    where: { customerId, productId: product.id },
    order: [["minQuantity", "DESC"]],
  });
  const match = tiers.find(
    (tier) => decimal.cmpQty(quantity, tier.minQuantity) >= 0,
  );
  return decimal.money(match ? match.unitPrice : product.sellingPrice);
};

const buildLines = async (items, customerId) => {
  uniqueProductIds(items);
  const lines = [];
  let subtotal = decimal.money(0);

  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    if (!product) throw AppError.badRequest("Product not found");
    if (product.status !== "ACTIVE") {
      throw AppError.badRequest(`Product ${product.sku} is inactive`);
    }
    const quantity = decimal.qty(item.quantity);
    const unitPrice =
      item.unitPrice == null
        ? await resolveUnitPrice(product, customerId, quantity)
        : decimal.money(item.unitPrice);
    const discountAmount = decimal.money(item.discountAmount || 0);
    const totalPrice = decimal.lineTotal(quantity, unitPrice, discountAmount);
    subtotal = decimal.addMoney(subtotal, totalPrice);
    lines.push({
      productId: product.id,
      quantity,
      unitPrice,
      discountAmount,
      totalPrice,
    });
  }

  return { lines, subtotal };
};

const headerTotals = (subtotal, taxAmount, discountAmount) => {
  const tax = decimal.money(taxAmount || 0);
  const discount = decimal.money(discountAmount || 0);
  const total = decimal.subMoney(decimal.addMoney(subtotal, tax), discount);
  if (decimal.cmpMoney(total, 0) < 0) {
    throw AppError.badRequest("Sale total cannot be negative");
  }
  return { taxAmount: tax, discountAmount: discount, totalAmount: total };
};

const customerDebt = async (customerId, transaction) => {
  const sales = await models.Sale.findAll({
    where: { customerId, status: "COMPLETED" },
    transaction,
  });
  return sales.reduce(
    (sum, sale) => decimal.addMoney(sum, decimal.subMoney(sale.totalAmount, sale.paidAmount)),
    decimal.money(0),
  );
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = saleRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  tenant.applyWarehouse(where, user);
  if (query.productId) {
    const itemRows = await models.SaleItem.findAll({
      attributes: ["saleId"],
      where: { productId: query.productId },
      raw: true,
    });
    where.id = { [Op.in]: itemRows.map((row) => row.saleId) };
  }
  const { rows, count } = await saleRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("sales", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const sale = await saleRepository.findById(id);
  tenant.assertOwned(user, sale, "Sale not found");
  tenant.assertWarehouseAccess(user, sale.warehouseId);
  return saleRepository.toPublic(sale);
};

exports.create = async (payload, user) => {
  const userId = user.id;
  tenant.assertWarehouseAccess(user, payload.warehouseId);
  await assertWarehouse(payload.warehouseId, user);
  const customer = await assertCustomer(payload.customerId || null, user);
  const { lines, subtotal } = await buildLines(
    payload.items,
    payload.customerId || null,
  );
  const totals = headerTotals(
    subtotal,
    payload.taxAmount,
    payload.discountAmount,
  );

  return sequelize.transaction(async (transaction) => {
    const invoiceNumber = await nextDocumentNumber("SALE", transaction);
    const sale = await saleRepository.create(
      {
        warehouseId: payload.warehouseId,
        createdBy: userId,
        companyId: tenant.companyIdOf(user),
        customerId: payload.customerId || null,
        invoiceNumber,
        customerName:
          emptyToNull(payload.customerName) || customer?.name || null,
        customerPhone:
          emptyToNull(payload.customerPhone) || customer?.phone || null,
        saleDate: payload.saleDate || new Date(),
        dueDate: payload.dueDate || null,
        subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        paidAmount: 0,
        paymentMethod: payload.paymentMethod,
        status: "DRAFT",
        notes: emptyToNull(payload.notes) ?? null,
      },
      transaction,
    );
    await saleRepository.replaceItems(sale.id, lines, transaction);
    const saved = await saleRepository.findById(sale.id, transaction);
    return saleRepository.toPublic(saved);
  });
};

exports.update = async (id, payload) => {
  const sale = await saleRepository.findById(id);
  if (!sale) throw AppError.notFound("Sale not found");
  if (sale.status !== "DRAFT") {
    throw AppError.badRequest("Only draft sales can be updated");
  }

  if (payload.warehouseId) await assertWarehouse(payload.warehouseId);
  if (payload.customerId !== undefined) {
    await assertCustomer(payload.customerId);
  }

  const customerId =
    payload.customerId !== undefined ? payload.customerId : sale.customerId;
  let lines = null;
  let subtotal = decimal.money(sale.subtotal);
  if (payload.items) {
    const built = await buildLines(payload.items, customerId);
    lines = built.lines;
    subtotal = built.subtotal;
  }

  const totals = headerTotals(
    subtotal,
    payload.taxAmount !== undefined ? payload.taxAmount : sale.taxAmount,
    payload.discountAmount !== undefined
      ? payload.discountAmount
      : sale.discountAmount,
  );

  return sequelize.transaction(async (transaction) => {
    const locked = await saleRepository.findByIdForUpdate(id, transaction);
    if (locked.status !== "DRAFT") {
      throw AppError.badRequest("Only draft sales can be updated");
    }
    if (payload.warehouseId) locked.warehouseId = payload.warehouseId;
    if (payload.customerId !== undefined) {
      locked.customerId = payload.customerId || null;
    }
    if (payload.customerName !== undefined) {
      locked.customerName = emptyToNull(payload.customerName);
    }
    if (payload.customerPhone !== undefined) {
      locked.customerPhone = emptyToNull(payload.customerPhone);
    }
    if (payload.saleDate) locked.saleDate = payload.saleDate;
    if (payload.dueDate !== undefined) locked.dueDate = payload.dueDate;
    if (payload.paymentMethod) locked.paymentMethod = payload.paymentMethod;
    if (payload.notes !== undefined) locked.notes = emptyToNull(payload.notes);
    locked.subtotal = subtotal;
    locked.taxAmount = totals.taxAmount;
    locked.discountAmount = totals.discountAmount;
    locked.totalAmount = totals.totalAmount;
    await locked.save({ transaction });
    if (lines) await saleRepository.replaceItems(id, lines, transaction);
    const saved = await saleRepository.findById(id, transaction);
    return saleRepository.toPublic(saved);
  });
};

exports.complete = async (id, userId, extras = {}) => {
  return sequelize.transaction(async (transaction) => {
    const sale = await saleRepository.findByIdForUpdate(id, transaction);
    if (!sale) throw AppError.notFound("Sale not found");
    if (sale.status === "COMPLETED") {
      const existing = await saleRepository.findById(id, transaction);
      return saleRepository.toPublic(existing);
    }
    if (sale.status !== "DRAFT") {
      throw AppError.badRequest("Only draft sales can be completed");
    }
    if (!sale.items?.length) {
      throw AppError.badRequest("Cannot complete a sale with no items");
    }

    await assertWarehouse(sale.warehouseId);

    let paid;
    if (extras.paidAmount != null && extras.paidAmount !== "") {
      paid = decimal.money(extras.paidAmount);
    } else {
      paid =
        sale.paymentMethod === "CREDIT"
          ? decimal.money(0)
          : decimal.money(sale.totalAmount);
    }
    if (decimal.cmpMoney(paid, 0) < 0) {
      throw AppError.badRequest("Paid amount cannot be negative");
    }
    if (decimal.cmpMoney(paid, sale.totalAmount) > 0) {
      throw AppError.badRequest("Paid amount cannot exceed the sale total");
    }
    const remaining = decimal.subMoney(sale.totalAmount, paid);

    if (decimal.cmpMoney(remaining, 0) > 0 && sale.customerId) {
      const customer = await Customer.findByPk(sale.customerId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const debt = await customerDebt(sale.customerId, transaction);
      const projected = decimal.addMoney(debt, remaining);
      if (
        decimal.cmpMoney(customer.creditLimit, 0) > 0 &&
        decimal.cmpMoney(projected, customer.creditLimit) > 0
      ) {
        throw AppError.badRequest("Customer credit limit would be exceeded");
      }
    }

    const pairs = sale.items.map((item) => ({
      productId: item.productId,
      warehouseId: sale.warehouseId,
    }));
    const locked = await inventoryPosting.lockInventories(pairs, transaction);

    for (const item of sale.items) {
      await inventoryPosting.postOutbound(
        {
          inventory: locked[`${item.productId}|${sale.warehouseId}`],
          quantity: item.quantity,
          type: "SALE",
          createdBy: userId,
          referenceType: "SALE",
          referenceId: sale.id,
          notes: sale.invoiceNumber,
        },
        transaction,
      );
    }

    sale.status = "COMPLETED";
    sale.paidAmount = paid;
    await sale.save({ transaction });
    const saved = await saleRepository.findById(id, transaction);
    return saleRepository.toPublic(saved);
  });
};

exports.recordPayment = async (id, payload, userId) => {
  return sequelize.transaction(async (transaction) => {
    const sale = await saleRepository.findByIdForUpdate(id, transaction);
    if (!sale) throw AppError.notFound("Sale not found");
    if (sale.status !== "COMPLETED") {
      throw AppError.badRequest("Only completed sales can receive extra payment");
    }
    const extra = decimal.money(payload.amount);
    const nextPaid = decimal.addMoney(sale.paidAmount || 0, extra);
    if (decimal.cmpMoney(nextPaid, sale.totalAmount) > 0) {
      throw AppError.badRequest("Payment exceeds the remaining balance");
    }
    sale.paidAmount = nextPaid;
    if (payload.paymentMethod) sale.paymentMethod = payload.paymentMethod;
    await sale.save({ transaction });

    if (sale.customerId) {
      await models.CustomerPayment.create(
        {
          customerId: sale.customerId,
          saleId: sale.id,
          recordedBy: userId,
          companyId: sale.companyId,
          amount: extra,
          method: payload.paymentMethod,
          paidAt: new Date(),
        },
        { transaction },
      );
    }

    const saved = await saleRepository.findById(id, transaction);
    return saleRepository.toPublic(saved);
  });
};

exports.cancel = async (id) => {
  const sale = await saleRepository.findById(id);
  if (!sale) throw AppError.notFound("Sale not found");
  if (sale.status !== "DRAFT") {
    throw AppError.badRequest("Only draft sales can be cancelled");
  }
  sale.status = "CANCELLED";
  const saved = await saleRepository.save(sale);
  return saleRepository.toPublic(saved);
};

exports.quote = async ({ customerId, productId, quantity }) => {
  const product = await Product.findByPk(productId);
  if (!product) throw AppError.notFound("Product not found");
  const unitPrice = await resolveUnitPrice(product, customerId, quantity);
  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    listPrice: decimal.money(product.sellingPrice),
    unitPrice,
    quantity: decimal.qty(quantity),
    lineTotal: decimal.lineTotal(quantity, unitPrice, 0),
  };
};
