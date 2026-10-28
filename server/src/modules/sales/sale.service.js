const sequelize = require("../../config/db");
const { Op } = require("sequelize");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const vat = require("../../shared/helpers/vat.helper");
const { nextDocumentNumber } = require("../../shared/helpers/documentNumber.helper");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const models = require("../../database/models");
const saleRepository = require("./sale.repository");
const tenant = require("../../shared/helpers/tenant.helper");
const jwt = require("../../shared/helpers/jwt.helper");
const stockBatchService = require("../inventory/stock-batch.service");
const customerService = require("./customer.service");
const excel = require("../../shared/helpers/excel.helper");

const {
  Product,
  Warehouse,
  Customer,
  CustomerPrice,
  Company,
  CompanyProfile,
  Inventory,
  PaymentMethod,
} = models;

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const normalizeSourceMode = (value) =>
  String(value || "ONLINE").toUpperCase() === "OFFLINE" ? "OFFLINE" : "ONLINE";

const withShare = (sale) => {
  if (!sale) return sale;
  return {
    ...sale,
    shareToken: jwt.signInvoiceToken(sale.id),
  };
};

const companyForSale = async (companyId) => {
  if (!companyId) {
    return { name: "", address: "", phone: "", email: "", tin: "", vatRate: vat.rate() };
  }
  const [profile, company] = await Promise.all([
    CompanyProfile.findOne({ where: { companyId } }),
    Company.findByPk(companyId),
  ]);
  return {
    name: profile?.name || company?.name || "",
    address: profile?.address || company?.address || "",
    phone: profile?.phone || company?.phone || "",
    email: profile?.email || "",
    tin: profile?.tin || "",
    vatRate: vat.rate(),
  };
};

const toPublicShare = (sale) => {
  const pub = saleRepository.toPublic(sale);
  return {
    id: pub.id,
    invoiceNumber: pub.invoiceNumber,
    customerName: pub.customerName,
    customerPhone: pub.customerPhone,
    saleDate: pub.saleDate,
    subtotal: pub.subtotal,
    taxAmount: pub.taxAmount,
    vatRate: pub.vatRate,
    discountAmount: pub.discountAmount,
    totalAmount: pub.totalAmount,
    paidAmount: pub.paidAmount,
    remainingBalance: pub.remainingBalance,
    paymentStatus: pub.paymentStatus,
    paymentMethod: pub.paymentMethod,
    status: pub.status,
    notes: pub.notes,
    warehouse: pub.warehouse ? { name: pub.warehouse.name } : null,
    creator: pub.creator ? { fullName: pub.creator.fullName } : null,
    customer: pub.customer
      ? { name: pub.customer.name, phone: pub.customer.phone }
      : null,
    items: (pub.items || []).map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      vatAmount: item.vatAmount,
      totalWithVat: item.totalWithVat,
      product: item.product
        ? {
            name: item.product.name,
            unit: item.product.unit,
            brand: item.product.brand,
            size: item.product.size,
            color: item.product.color,
          }
        : null,
    })),
  };
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

const buildLines = async (items, customerId, user) => {
  uniqueProductIds(items);
  const lines = [];
  let subtotal = decimal.money(0);

  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    tenant.assertOwned(user, product, "Product not found");
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

const headerTotals = (subtotal, discountAmount) => vat.apply(subtotal, discountAmount);

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

const unwindCompletedStock = async (locked, transaction, notes) => {
  const pairs = (locked.items || []).map((item) => ({
    productId: item.productId,
    warehouseId: locked.warehouseId,
  }));
  if (!pairs.length) return;
  const inventories = await inventoryPosting.lockInventories(pairs, transaction);
  await stockBatchService.restoreSaleAllocations(
    { saleId: locked.id },
    transaction,
  );
  for (const item of locked.items || []) {
    const inventory = inventories[`${item.productId}|${locked.warehouseId}`];
    await inventoryPosting.postInbound(
      {
        inventory,
        quantity: item.quantity,
        unitCost: inventory.averageCost,
        type: "ADJUSTMENT_IN",
        createdBy: locked.createdBy,
        referenceType: "SALE",
        referenceId: locked.id,
        notes: notes || `Cancel ${locked.invoiceNumber}`,
      },
      transaction,
    );
    await stockBatchService.refreshAverageCost(inventory, transaction);
  }
};

const deductSaleStock = async ({ sale, extras, userId, transaction }) => {
  const pairs = (sale.items || []).map((item) => ({
    productId: item.productId,
    warehouseId: sale.warehouseId,
  }));
  const locked = await inventoryPosting.lockInventories(pairs, transaction);
  const costingByProduct = new Map(
    (extras.items || []).map((row) => [row.productId, row]),
  );
  for (const item of sale.items || []) {
    const inventory = locked[`${item.productId}|${sale.warehouseId}`];
    const costing = costingByProduct.get(item.productId) || {};
    const method = costing.costingMethod || extras.costingMethod || "SIMPLE";
    const picks = await stockBatchService.consumeForSale(
      {
        inventory,
        quantity: item.quantity,
        costingMethod: method,
        allocations: costing.allocations,
      },
      transaction,
    );
    const unitCost = stockBatchService.weightedUnitCost(picks);
    await inventoryPosting.postOutbound(
      {
        inventory,
        quantity: item.quantity,
        unitCost,
        type: "SALE",
        createdBy: userId,
        referenceType: "SALE",
        referenceId: sale.id,
        notes: sale.invoiceNumber,
      },
      transaction,
    );
    await stockBatchService.recordSaleAllocations(
      {
        saleId: sale.id,
        saleItemId: item.id,
        companyId: sale.companyId,
        costingMethod: method,
        picks,
      },
      transaction,
    );
    await stockBatchService.refreshAverageCost(inventory, transaction);
  }
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query, {
    defaultLimit: 200,
    maxLimit: 500,
  });
  const where = saleRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  tenant.applyWarehouse(where, user);
  if (query.productId) {
    const itemRows = await models.SaleItem.findAll({
      attributes: ["saleId"],
      where: { productId: query.productId },
      raw: true,
    });
    const saleIds = itemRows.map((row) => row.saleId);
    if (!saleIds.length) {
      return paginate.buildResult("sales", [], 0, page, limit);
    }
    where.id = { [Op.in]: saleIds };
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
  return withShare(saleRepository.toPublic(sale));
};

exports.getPublicInvoice = async (token) => {
  let payload;
  try {
    payload = jwt.verifyInvoiceToken(token);
  } catch {
    throw AppError.unauthorized("This invoice link is invalid or expired");
  }
  if (payload.typ !== "invoice" || !payload.sid) {
    throw AppError.unauthorized("This invoice link is invalid or expired");
  }
  const sale = await saleRepository.findById(payload.sid);
  if (!sale || sale.status === "CANCELLED") {
    throw AppError.notFound("Invoice not found");
  }
  return {
    company: await companyForSale(sale.companyId),
    sale: toPublicShare(sale),
  };
};

exports.create = async (payload, user) => {
  const userId = user.id;
  const companyId = tenant.companyIdOf(user);
  if (payload.clientTransactionId) {
    const existing = await saleRepository.findByClientTransactionId(
      payload.clientTransactionId,
      companyId,
    );
    if (existing) return saleRepository.toPublic(existing);
  }
  tenant.assertWarehouseAccess(user, payload.warehouseId);
  await assertWarehouse(payload.warehouseId, user);
  const customer = await assertCustomer(payload.customerId || null, user);
  const { lines, subtotal } = await buildLines(
    payload.items,
    payload.customerId || null,
    user,
  );
  const totals = headerTotals(subtotal, payload.discountAmount);

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
        clientTransactionId: payload.clientTransactionId || null,
        sourceMode: normalizeSourceMode(payload.sourceMode),
      },
      transaction,
    );
    await saleRepository.replaceItems(sale.id, lines, transaction);
    const saved = await saleRepository.findById(sale.id, transaction);
    return saleRepository.toPublic(saved);
  });
};

exports.update = async (id, payload, user) => {
  const sale = await saleRepository.findById(id);
  tenant.assertOwned(user, sale, "Sale not found");
  tenant.assertWarehouseAccess(user, sale.warehouseId);
  if (sale.status !== "DRAFT") {
    throw AppError.badRequest("Only draft sales can be updated");
  }

  if (payload.warehouseId) {
    tenant.assertWarehouseAccess(user, payload.warehouseId);
    await assertWarehouse(payload.warehouseId, user);
  }
  if (payload.customerId !== undefined) {
    await assertCustomer(payload.customerId, user);
  }

  const customerId =
    payload.customerId !== undefined ? payload.customerId : sale.customerId;
  let lines = null;
  let subtotal = decimal.money(sale.subtotal);
  if (payload.items) {
    const built = await buildLines(payload.items, customerId, user);
    lines = built.lines;
    subtotal = built.subtotal;
  }

  const totals = headerTotals(
    subtotal,
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

exports.complete = async (id, user, extras = {}, options = {}) => {
  const userId = user.id;
  const run = async (transaction) => {
    const sale = await saleRepository.findByIdForUpdate(id, transaction);
    tenant.assertOwned(user, sale, "Sale not found");
    tenant.assertWarehouseAccess(user, sale.warehouseId);
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

    await assertWarehouse(sale.warehouseId, user);

    const payFromWallet =
      customerService.isWalletPay(extras.payFrom) ||
      customerService.isWalletPay(extras.paymentMethod) ||
      customerService.isWalletPay(sale.paymentMethod);

    let paid;
    if (extras.paidAmount != null && extras.paidAmount !== "") {
      paid = decimal.money(extras.paidAmount);
    } else {
      paid =
        sale.paymentMethod === "CREDIT" || payFromWallet
          ? payFromWallet
            ? decimal.money(sale.totalAmount)
            : decimal.money(0)
          : decimal.money(sale.totalAmount);
    }
    if (decimal.cmpMoney(paid, 0) < 0) {
      throw AppError.badRequest("Paid amount cannot be negative");
    }
    if (decimal.cmpMoney(paid, sale.totalAmount) > 0) {
      throw AppError.badRequest("Paid amount cannot exceed the sale total");
    }

    if (payFromWallet) {
      if (!sale.customerId) {
        throw AppError.badRequest("Wallet payment needs a registered customer");
      }
      if (decimal.cmpMoney(paid, 0) > 0) {
        await customerService.deductWalletForSale(
          {
            customerId: sale.customerId,
            amount: paid,
            saleId: sale.id,
            userId,
            companyId: sale.companyId,
          },
          transaction,
        );
      }
      sale.paymentMethod = "WALLET";
    } else if (extras.paymentMethod) {
      sale.paymentMethod = extras.paymentMethod;
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

    await deductSaleStock({ sale, extras, userId, transaction });

    sale.status = "COMPLETED";
    sale.paidAmount = paid;
    await sale.save({ transaction });
    const saved = await saleRepository.findById(id, transaction);
    return saleRepository.toPublic(saved);
  };

  if (options.transaction) return run(options.transaction);
  return sequelize.transaction(run);
};

exports.recordPayment = async (id, payload, user, options = {}) => {
  const userId = user.id;
  const run = async (transaction) => {
    const sale = await saleRepository.findByIdForUpdate(id, transaction);
    tenant.assertOwned(user, sale, "Sale not found");
    tenant.assertWarehouseAccess(user, sale.warehouseId);
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
  };

  if (options.transaction) return run(options.transaction);
  return sequelize.transaction(run);
};

exports.revise = async (id, payload, user) => {
  const userId = user.id;
  tenant.assertWarehouseAccess(user, payload.warehouseId);
  await assertWarehouse(payload.warehouseId, user);
  const customer = await assertCustomer(payload.customerId || null, user);
  const { lines, subtotal } = await buildLines(
    payload.items,
    payload.customerId || null,
    user,
  );
  const totals = headerTotals(subtotal, payload.discountAmount);

  return sequelize.transaction(async (transaction) => {
    const locked = await saleRepository.findByIdForUpdate(id, transaction);
    tenant.assertOwned(user, locked, "Sale not found");
    if (locked.status !== "COMPLETED") {
      throw AppError.badRequest("Only completed sales can be revised from the sales list");
    }

    await customerService.refundWalletForSale(
      { saleId: locked.id, userId },
      transaction,
    );
    await unwindCompletedStock(
      locked,
      transaction,
      `Revise ${locked.invoiceNumber}`,
    );

    if (payload.warehouseId) locked.warehouseId = payload.warehouseId;
    locked.customerId = payload.customerId || null;
    locked.customerName =
      emptyToNull(payload.customerName) || customer?.name || null;
    locked.customerPhone =
      emptyToNull(payload.customerPhone) || customer?.phone || null;
    if (payload.paymentMethod) locked.paymentMethod = payload.paymentMethod;
    locked.subtotal = subtotal;
    locked.taxAmount = totals.taxAmount;
    locked.discountAmount = totals.discountAmount;
    locked.totalAmount = totals.totalAmount;
    await locked.save({ transaction });
    await saleRepository.replaceItems(id, lines, transaction);

    const sale = await saleRepository.findByIdForUpdate(id, transaction);
    const extras = {
      paidAmount: payload.paidAmount,
      payFrom: payload.payFrom,
      paymentMethod: payload.paymentMethod,
      costingMethod: payload.costingMethod,
      items: payload.items,
    };

    const payFromWallet =
      customerService.isWalletPay(extras.payFrom) ||
      customerService.isWalletPay(extras.paymentMethod) ||
      customerService.isWalletPay(sale.paymentMethod);

    let paid;
    if (extras.paidAmount != null && extras.paidAmount !== "") {
      paid = decimal.money(extras.paidAmount);
    } else {
      paid = decimal.money(sale.totalAmount);
    }
    if (decimal.cmpMoney(paid, 0) < 0) {
      throw AppError.badRequest("Paid amount cannot be negative");
    }
    if (decimal.cmpMoney(paid, sale.totalAmount) > 0) {
      throw AppError.badRequest("Paid amount cannot exceed the sale total");
    }

    if (payFromWallet) {
      if (!sale.customerId) {
        throw AppError.badRequest("Wallet payment needs a registered customer");
      }
      if (decimal.cmpMoney(paid, 0) > 0) {
        await customerService.deductWalletForSale(
          {
            customerId: sale.customerId,
            amount: paid,
            saleId: sale.id,
            userId,
            companyId: sale.companyId,
          },
          transaction,
        );
      }
      sale.paymentMethod = "WALLET";
    }

    await deductSaleStock({ sale, extras, userId, transaction });
    sale.paidAmount = paid;
    sale.status = "COMPLETED";
    await sale.save({ transaction });
    const saved = await saleRepository.findById(id, transaction);
    return saleRepository.toPublic(saved);
  });
};

exports.cancel = async (id, user) => {
  const sale = await saleRepository.findById(id);
  tenant.assertOwned(user, sale, "Sale not found");
  tenant.assertWarehouseAccess(user, sale.warehouseId);
  if (sale.status === "COMPLETED") {
    return sequelize.transaction(async (transaction) => {
      const locked = await saleRepository.findByIdForUpdate(id, transaction);
      if (locked.status !== "COMPLETED") {
        throw AppError.badRequest("Only completed or draft sales can be cancelled");
      }
      await unwindCompletedStock(
        locked,
        transaction,
        `Cancel ${locked.invoiceNumber}`,
      );
      locked.status = "CANCELLED";
      await customerService.refundWalletForSale(
        { saleId: locked.id, userId: locked.createdBy },
        transaction,
      );
      await locked.save({ transaction });
      const saved = await saleRepository.findById(id, transaction);
      return saleRepository.toPublic(saved);
    });
  }
  if (sale.status !== "DRAFT") {
    throw AppError.badRequest("Only draft or completed sales can be cancelled");
  }
  sale.status = "CANCELLED";
  const saved = await saleRepository.save(sale);
  return saleRepository.toPublic(saved);
};

exports.quote = async ({ customerId, productId, quantity }, user) => {
  const product = await Product.findByPk(productId);
  tenant.assertOwned(user, product, "Product not found");
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

const parseImportNumber = (value) => {
  const text = String(value || "")
    .replace(/,/g, "")
    .trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};

const parseImportDate = (value) => {
  const text = String(value || "").trim();
  if (!text) return new Date();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return new Date(text);
  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial > 20000 && serial < 80000) {
      return new Date(Math.round((serial - 25569) * 86400 * 1000));
    }
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const matchPaymentMethod = (value, methods) => {
  const needle = String(value || "")
    .trim()
    .toLowerCase();
  if (!needle) return null;
  return (
    methods.find((row) => row.name.toLowerCase() === needle)?.name ||
    methods.find((row) => row.name.toLowerCase().includes(needle))?.name ||
    null
  );
};

const findImportProduct = async (name, user) => {
  const text = String(name || "").trim();
  if (!text) return null;
  const where = { status: "ACTIVE" };
  tenant.applyCompany(where, user);
  const exact = await Product.findOne({ where: { ...where, name: text } });
  if (exact) return exact;
  return Product.findOne({
    where: { ...where, name: { [Op.like]: text } },
  });
};

const findImportCustomer = async (name, user) => {
  const text = String(name || "").trim();
  if (!text || /^walk[-\s]?in$/i.test(text)) return null;
  const where = { status: "ACTIVE", type: "CUSTOMER", name: text };
  tenant.applyCompany(where, user);
  return Customer.findOne({ where });
};

const findStockWarehouse = async (productId, quantity, user) => {
  const where = { productId };
  tenant.applyCompany(where, user);
  tenant.applyWarehouse(where, user);
  const rows = await Inventory.findAll({
    where,
    include: [{ model: Warehouse, as: "warehouse" }],
  });
  const need = decimal.qty(quantity);
  return (
    rows.find((row) => {
      if (row.warehouse?.status !== "ACTIVE") return false;
      const available = decimal.available(row.quantity, row.reservedQuantity);
      return decimal.cmpQty(available, need) >= 0;
    }) || null
  );
};

exports.buildImportTemplate = () => excel.buildSaleTemplateBuffer();

exports.importFromExcel = async (buffer, user) => {
  if (!buffer || !buffer.length) {
    throw AppError.badRequest("Upload an Excel file");
  }
  let rows;
  try {
    rows = excel.parseSaleRows(buffer);
  } catch {
    throw AppError.badRequest("Could not read that Excel file");
  }
  if (!rows.length) {
    throw AppError.badRequest("The Excel file has no sale rows");
  }
  if (rows.length > 300) {
    throw AppError.badRequest("Import at most 300 rows at a time");
  }

  const { paymentMethodWhere } = require("./payment-method.defaults");
  const methods = await PaymentMethod.findAll({
    where: paymentMethodWhere(user, { status: "ACTIVE" }),
    order: [["name", "ASC"]],
  });
  const defaultMethod = methods[0]?.name || "Cash Payment";
  const imported = [];
  const skipped = [];
  const vatDivisor = 1 + vat.rate() / 100;

  for (const row of rows) {
    let draftId = null;
    try {
      const itemName = String(row.itemName || "").trim();
      if (!itemName) {
        skipped.push({ rowNumber: row.rowNumber, reason: "No item name" });
        continue;
      }

      const product = await findImportProduct(itemName, user);
      if (!product) {
        skipped.push({
          rowNumber: row.rowNumber,
          reason: `Item "${itemName}" was not found in the catalog`,
        });
        continue;
      }

      let quantity = parseImportNumber(row.quantity);
      if (quantity === null || quantity <= 0) quantity = 1;

      let unitPrice = parseImportNumber(row.unitPrice);
      const costWithVat = parseImportNumber(row.costWithVat);
      if (unitPrice === null || unitPrice < 0) unitPrice = 0;
      if (unitPrice === 0 && costWithVat && costWithVat > 0) {
        const netTotal = Number((costWithVat / vatDivisor).toFixed(2));
        unitPrice = Number((netTotal / quantity).toFixed(2));
      }
      if (unitPrice <= 0) {
        skipped.push({
          rowNumber: row.rowNumber,
          reason: "Add a unit price or cost with VAT",
        });
        continue;
      }

      const stock = await findStockWarehouse(product.id, quantity, user);
      if (!stock) {
        skipped.push({
          rowNumber: row.rowNumber,
          reason: `Not enough stock for "${itemName}"`,
        });
        continue;
      }

      const customer = await findImportCustomer(row.customer, user);
      const customerName = String(row.customer || "").trim();
      const paymentMethod =
        matchPaymentMethod(row.method, methods) || defaultMethod;
      if (customerService.isWalletPay(paymentMethod) && !customer) {
        skipped.push({
          rowNumber: row.rowNumber,
          reason: "Wallet payment needs a registered customer",
        });
        continue;
      }

      const created = await exports.create(
        {
          warehouseId: stock.warehouseId,
          customerId: customer?.id || null,
          customerName: customer?.name || customerName || null,
          saleDate: parseImportDate(row.date),
          paymentMethod,
          notes: "Imported from Excel",
          items: [{ productId: product.id, quantity, unitPrice }],
        },
        user,
      );
      draftId = created.id;

      let paid = parseImportNumber(row.paid);
      const remainingHint = parseImportNumber(row.remaining);
      if ((paid === null || paid < 0) && remainingHint != null && remainingHint >= 0) {
        paid = Number(decimal.subMoney(created.totalAmount, remainingHint));
        if (paid < 0) paid = 0;
      }
      if (paid === null || paid < 0) paid = Number(created.totalAmount);
      if (decimal.cmpMoney(paid, created.totalAmount) > 0) {
        paid = Number(created.totalAmount);
      }

      const completed = await exports.complete(created.id, user, {
        paidAmount: paid,
        costingMethod: "FIFO",
      });

      imported.push({
        rowNumber: row.rowNumber,
        invoiceNumber: completed.invoiceNumber,
        itemName,
      });
    } catch (err) {
      if (draftId) {
        try {
          await exports.cancel(draftId, user);
        } catch {
          /* leave cancelled/failed draft rather than blocking the rest */
        }
      }
      skipped.push({
        rowNumber: row.rowNumber,
        reason:
          err.statusCode && err.message
            ? err.message
            : "Could not import this row",
      });
    }
  }

  return {
    importedCount: imported.length,
    skippedCount: skipped.length,
    imported,
    skipped,
  };
};

exports.sync = async (payload, user) => {
  const companyId = tenant.companyIdOf(user);
  const existing = await saleRepository.findByClientTransactionId(
    payload.clientTransactionId,
    companyId,
  );
  if (existing?.status === "COMPLETED") {
    return saleRepository.toPublic(existing);
  }

  const completeExtras = {
    paidAmount: payload.paidAmount,
    payFrom: payload.payFrom || "DIRECT",
    paymentMethod: payload.paymentMethod,
    costingMethod: payload.costingMethod || "SIMPLE",
    items: (payload.items || []).map((item) => ({
      productId: item.productId,
      costingMethod: payload.costingMethod || "SIMPLE",
    })),
  };

  if (existing?.status === "DRAFT") {
    return exports.complete(existing.id, user, completeExtras);
  }

  const created = await exports.create(
    {
      ...payload,
      sourceMode: normalizeSourceMode(payload.sourceMode),
    },
    user,
  );
  return exports.complete(created.id, user, completeExtras);
};
