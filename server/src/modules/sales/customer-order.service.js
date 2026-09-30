const sequelize = require("../../config/db");
const { Op } = require("sequelize");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const vat = require("../../shared/helpers/vat.helper");
const { nextDocumentNumber } = require("../../shared/helpers/documentNumber.helper");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const models = require("../../database/models");
const orderRepository = require("./customer-order.repository");
const tenant = require("../../shared/helpers/tenant.helper");
const jwt = require("../../shared/helpers/jwt.helper");
const stockBatchService = require("../inventory/stock-batch.service");

const { Product, Warehouse, PaymentMethod, Inventory, Sale, SaleItem, Company, CompanyProfile, Customer } = models;

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const findCustomerForOrder = async (order, transaction) => {
  if (!order?.companyId) return null;
  const phoneDigits = digitsOnly(order.customerPhone);
  const where = {
    companyId: order.companyId,
    type: "CUSTOMER",
    status: "ACTIVE",
  };
  const candidates = await Customer.findAll({
    where,
    transaction,
    limit: 500,
  });
  if (!candidates.length) return null;
  const byPhone = candidates.find(
    (row) => digitsOnly(row.phone) === phoneDigits && phoneDigits.length >= 7,
  );
  if (byPhone) return byPhone;
  const name = String(order.customerName || "").trim().toLowerCase();
  if (!name) return null;
  return (
    candidates.find((row) => String(row.name || "").trim().toLowerCase() === name) ||
    null
  );
};

const clampPaid = (totalAmount, paidAmount) => {
  const settled = orderRepository.settlePaid(totalAmount, paidAmount);
  if (decimal.cmpMoney(settled.paid, settled.total) > 0) {
    throw AppError.badRequest("Paid amount cannot exceed the order total");
  }
  return settled;
};

const uniqueProducts = (items) => {
  const ids = items.map((item) => item.productId);
  if (new Set(ids).size !== ids.length) {
    throw AppError.badRequest("Duplicate products are not allowed on an order");
  }
};

const withShare = (order) => {
  if (!order) return order;
  return {
    ...order,
    shareToken: jwt.signProformaToken(order.id),
  };
};

const companyForOrder = async (companyId) => {
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

const availableOfProduct = async (productId, companyId) => {
  const where = { productId };
  if (companyId) where.companyId = companyId;
  let rows = await Inventory.findAll({ where });
  if (!rows.length && companyId) {
    rows = await Inventory.findAll({
      where: { productId, companyId: null },
    });
  }
  if (!rows.length) {
    rows = await Inventory.findAll({ where: { productId } });
  }
  return rows.reduce(
    (sum, row) => decimal.addQty(sum, decimal.available(row.quantity, row.reservedQuantity)),
    decimal.qty(0),
  );
};

const buildLines = async (items, { checkStock, companyId } = {}) => {
  uniqueProducts(items);
  const lines = [];
  let subtotal = decimal.money(0);
  for (const item of items) {
    const productId = String(item.productId || "").trim();
    if (!productId) throw AppError.badRequest("Product not found");
    const product = await Product.findByPk(productId);
    if (!product) throw AppError.badRequest("Product not found");
    // Allow legacy rows with null companyId; only reject a clear company mismatch.
    if (
      companyId &&
      product.companyId &&
      String(product.companyId) !== String(companyId)
    ) {
      throw AppError.badRequest("Product not found");
    }
    if (product.status !== "ACTIVE") {
      throw AppError.badRequest(`${product.name} is not available`);
    }
    const quantity = decimal.qty(item.quantity);
    if (checkStock) {
      const available = await availableOfProduct(product.id, companyId);
      if (decimal.cmpQty(available, quantity) < 0) {
        throw AppError.badRequest(`Not enough ${product.name} in store`);
      }
    }
    const unitPrice = decimal.money(
      item.unitPrice != null ? item.unitPrice : product.sellingPrice,
    );
    const totalPrice = decimal.lineTotal(quantity, unitPrice, 0);
    subtotal = decimal.addMoney(subtotal, totalPrice);
    lines.push({
      productId: product.id,
      quantity,
      unitPrice,
      totalPrice,
    });
  }
  return { lines, subtotal };
};

const resolvePaymentMethod = async (paymentMethodId, user) => {
  const companyId = tenant.companyIdOf(user);
  const id = String(paymentMethodId || "").trim();
  if (id) {
    const method = await PaymentMethod.findByPk(id);
    if (method && method.status === "ACTIVE") {
      if (!method.companyId || String(method.companyId) === String(companyId)) {
        return method;
      }
    }
  }
  const where = { status: "ACTIVE" };
  if (companyId) {
    where[Op.or] = [{ companyId }, { companyId: null }];
  }
  const fallback = await PaymentMethod.findOne({
    where,
    order: [["name", "ASC"]],
  });
  if (!fallback) {
    throw AppError.badRequest(
      "No payment method found. Add one under Payment methods, then try again.",
    );
  }
  return fallback;
};

const resolveWarehouse = async (warehouseId, user) => {
  const companyId = tenant.companyIdOf(user);
  const id = String(warehouseId || "").trim();
  const usable = (row) =>
    row &&
    row.status === "ACTIVE" &&
    (!companyId || !row.companyId || String(row.companyId) === String(companyId));

  if (id) {
    const warehouse = await Warehouse.findByPk(id);
    if (usable(warehouse)) {
      try {
        tenant.assertWarehouseAccess(user, warehouse.id);
        return warehouse;
      } catch {
        /* fall through to company default */
      }
    }
  }

  const where = { status: "ACTIVE" };
  if (companyId) {
    where[Op.or] = [{ companyId }, { companyId: null }];
  }
  const rows = await Warehouse.findAll({ where, order: [["name", "ASC"]] });
  for (const row of rows) {
    try {
      tenant.assertWarehouseAccess(user, row.id);
      return row;
    } catch {
      /* try next */
    }
  }
  throw AppError.badRequest(
    "No warehouse found that you can access. Ask your company owner to assign a store.",
  );
};

const onHandAtWarehouse = async (productId, warehouseId, transaction) => {
  const row = await Inventory.findOne({
    where: { productId, warehouseId },
    transaction,
  });
  return decimal.available(row?.quantity || 0, row?.reservedQuantity || 0);
};

/** Prefer the requested store; otherwise pick one that can fulfill every line. */
const resolveWarehouseForLines = async (warehouseId, user, lines, transaction) => {
  const companyId = tenant.companyIdOf(user);
  const where = { status: "ACTIVE" };
  if (companyId) {
    where[Op.or] = [{ companyId }, { companyId: null }];
  }
  let candidates = await Warehouse.findAll({
    where,
    order: [["name", "ASC"]],
    transaction,
  });
  candidates = candidates.filter((row) => {
    try {
      tenant.assertWarehouseAccess(user, row.id);
      return true;
    } catch {
      return false;
    }
  });
  if (!candidates.length) {
    throw AppError.badRequest(
      "No warehouse found that you can access. Ask your company owner to assign a store.",
    );
  }

  const canFulfill = async (warehouse) => {
    for (const item of lines) {
      const onHand = await onHandAtWarehouse(
        item.productId,
        warehouse.id,
        transaction,
      );
      if (decimal.cmpQty(onHand, item.quantity) < 0) return false;
    }
    return true;
  };

  const requestedId = String(warehouseId || "").trim();
  if (requestedId) {
    const requested = candidates.find((row) => String(row.id) === requestedId);
    if (requested && (await canFulfill(requested))) return requested;
  }

  for (const warehouse of candidates) {
    if (await canFulfill(warehouse)) return warehouse;
  }

  // Build a clear shortage message from the best-effort store (requested or first).
  const focus =
    candidates.find((row) => String(row.id) === requestedId) || candidates[0];
  const shortages = [];
  for (const item of lines) {
    const onHand = await onHandAtWarehouse(item.productId, focus.id, transaction);
    if (decimal.cmpQty(onHand, item.quantity) < 0) {
      const product = await Product.findByPk(item.productId, { transaction });
      shortages.push(
        `${product?.name || "Item"}: need ${item.quantity}, ${focus.name} has ${onHand}`,
      );
    }
  }
  throw AppError.badRequest(
    shortages.length
      ? `Not enough stock to add to sales. ${shortages.join("; ")}`
      : "Not enough stock in any store for this order",
  );
};

const assertOrderAccess = (user, order) => {
  if (!order) throw AppError.notFound("Order not found");
  const companyId = tenant.companyIdOf(user);
  if (tenant.isOwner(user) && !companyId) return order;
  if (companyId && !order.companyId) {
    order.companyId = companyId;
  } else if (
    companyId &&
    order.companyId &&
    String(order.companyId) !== String(companyId)
  ) {
    throw AppError.notFound("Order not found");
  } else if (!companyId && !tenant.isOwner(user)) {
    throw AppError.notFound("Order not found");
  }
  if (order.warehouseId) {
    tenant.assertWarehouseAccess(user, order.warehouseId);
  }
  return order;
};

exports.listCatalog = async (companyId) => {
  if (!companyId) return [];
  const products = await Product.findAll({
    where: { status: "ACTIVE", companyId },
    attributes: ["id", "name", "unit", "sellingPrice", "brand"],
    order: [["name", "ASC"]],
  });
  const inventory = await Inventory.findAll({ where: { companyId } });
  const stock = {};
  for (const row of inventory) {
    stock[row.productId] = decimal.addQty(
      stock[row.productId] || 0,
      decimal.available(row.quantity, row.reservedQuantity),
    );
  }
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    unit: product.unit,
    brand: product.brand,
    sellingPrice: product.sellingPrice,
    available: stock[product.id] || "0.000",
  }));
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query, { defaultLimit: 50, maxLimit: 100 });
  const where = orderRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  const warehouseIds = tenant.warehouseIdsOf(user);
  if (warehouseIds) {
    const warehouseFilter = warehouseIds.length
      ? warehouseIds.length === 1
        ? warehouseIds[0]
        : { [Op.in]: warehouseIds }
      : null;
    where[Op.and] = [
      ...(Array.isArray(where[Op.and]) ? where[Op.and] : where[Op.and] ? [where[Op.and]] : []),
      {
        [Op.or]: [{ warehouseId: null }, { warehouseId: warehouseFilter }],
      },
    ];
  }
  if (query.productId) {
    const itemRows = await models.CustomerOrderItem.findAll({
      attributes: ["customerOrderId"],
      where: { productId: query.productId },
      raw: true,
    });
    where.id = { [Op.in]: itemRows.map((row) => row.customerOrderId) };
  }
  const { rows, count } = await orderRepository.findAndCount({ where, limit, offset });
  return paginate.buildResult("orders", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const order = await orderRepository.findById(id);
  assertOrderAccess(user, order);
  return withShare(orderRepository.toPublic(order));
};

exports.getPublicProforma = async (token) => {
  let payload;
  try {
    payload = jwt.verifyProformaToken(token);
  } catch {
    throw AppError.unauthorized("This proforma link is invalid or expired");
  }
  if (payload.typ !== "proforma" || !payload.oid) {
    throw AppError.unauthorized("This proforma link is invalid or expired");
  }
  const order = await orderRepository.findById(payload.oid);
  if (!order) throw AppError.notFound("Proforma not found");
  return {
    company: await companyForOrder(order.companyId),
    order: orderRepository.toPublic(order),
  };
};

exports.create = async (payload, user) => {
  const companyId = tenant.requireCompanyId(user);
  const { lines, subtotal } = await buildLines(payload.items, {
    checkStock: false,
    companyId,
  });
  const totals = vat.apply(subtotal);
  return sequelize.transaction(async (transaction) => {
    const orderNumber = await nextDocumentNumber("CUSTOMER_ORDER", transaction);
    const order = await orderRepository.create(
      {
        orderNumber,
        customerName: String(payload.customerName).trim(),
        customerPhone: String(payload.customerPhone).trim(),
        deliveryDate: payload.deliveryDate,
        status: "PENDING",
        paymentStatus: "UNPAID",
        subtotal,
        totalAmount: totals.totalAmount,
        companyId,
        paidAmount: 0,
        notes: payload.notes || null,
      },
      transaction,
    );
    await orderRepository.replaceItems(order.id, lines, transaction);
    const saved = await orderRepository.findById(order.id, transaction);
    return withShare(orderRepository.toPublic(saved));
  });
};

exports.updatePending = async (id, payload, user) => {
  const order = await orderRepository.findById(id);
  assertOrderAccess(user, order);
  if (order.status !== "PENDING") {
    throw AppError.badRequest("Only pending orders can be edited");
  }
  const { lines, subtotal } = payload.items
    ? await buildLines(payload.items, {
        checkStock: false,
        companyId: tenant.companyIdOf(user) || order.companyId,
      })
    : { lines: null, subtotal: order.subtotal };

  return sequelize.transaction(async (transaction) => {
    const locked = await orderRepository.findByIdForUpdate(id, transaction);
    assertOrderAccess(user, locked);
    if (payload.deliveryDate) locked.deliveryDate = payload.deliveryDate;
    if (payload.customerName) locked.customerName = payload.customerName;
    if (payload.customerPhone) locked.customerPhone = payload.customerPhone;
    if (payload.notes !== undefined) locked.notes = payload.notes || null;
    locked.subtotal = subtotal;
    locked.totalAmount = vat.apply(subtotal).totalAmount;
    await locked.save({ transaction });
    if (lines) await orderRepository.replaceItems(id, lines, transaction);
    const saved = await orderRepository.findById(id, transaction);
    return withShare(orderRepository.toPublic(saved));
  });
};

exports.approve = async (id, payload, user) => {
  const userId = user.id;
  const method = await resolvePaymentMethod(payload.paymentMethodId, user);

  return sequelize.transaction(async (transaction) => {
    const order = await orderRepository.findByIdForUpdate(id, transaction);
    assertOrderAccess(user, order);
    if (order.status !== "PENDING") {
      throw AppError.badRequest("Only pending orders can be added to sales");
    }

    const storedItems = order.items || order.get?.("items") || [];
    let lines = [];

    if (payload.items?.length) {
      const built = await buildLines(payload.items, {
        checkStock: false,
        companyId: tenant.companyIdOf(user) || order.companyId,
      });
      await orderRepository.replaceItems(id, built.lines, transaction);
      order.subtotal = built.subtotal;
      lines = built.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
      }));
    } else if (storedItems.length) {
      lines = storedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));
    } else {
      throw AppError.badRequest("Order has no items");
    }

    const warehouse = await resolveWarehouseForLines(
      payload.warehouseId,
      user,
      lines,
      transaction,
    );

    const totals = vat.apply(order.subtotal);
    order.totalAmount = totals.totalAmount;

    const settled = clampPaid(order.totalAmount, payload.paidAmount || 0);
    const paidAmount = settled.paid;

    const matchedCustomer = await findCustomerForOrder(order, transaction);

    const now = new Date();
    const saleDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      12,
      0,
      0,
      0,
    );

    const invoiceNumber = await nextDocumentNumber("SALE", transaction);
    const sale = await Sale.create(
      {
        warehouseId: warehouse.id,
        createdBy: userId,
        companyId: order.companyId,
        customerId: matchedCustomer?.id || null,
        invoiceNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        saleDate,
        dueDate: order.deliveryDate,
        subtotal: order.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: 0,
        totalAmount: totals.totalAmount,
        paidAmount,
        paymentMethod: method.name,
        status: "COMPLETED",
        notes: `Customer order ${order.orderNumber}`,
      },
      { transaction },
    );
    await SaleItem.bulkCreate(
      lines.map((item) => ({
        saleId: sale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: 0,
        totalPrice: item.totalPrice,
      })),
      { transaction },
    );
    const createdItems = await SaleItem.findAll({
      where: { saleId: sale.id },
      transaction,
    });
    const itemByProduct = new Map(
      createdItems.map((row) => [row.productId, row]),
    );

    const pairs = lines.map((item) => ({
      productId: item.productId,
      warehouseId: warehouse.id,
    }));
    const locked = await inventoryPosting.lockInventories(pairs, transaction);
    for (const item of lines) {
      const inventory = locked[`${item.productId}|${warehouse.id}`];
      const saleItem = itemByProduct.get(item.productId);
      const picks = await stockBatchService.consumeForSale(
        {
          inventory,
          quantity: item.quantity,
          costingMethod: "SIMPLE",
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
      if (saleItem) {
        await stockBatchService.recordSaleAllocations(
          {
            saleId: sale.id,
            saleItemId: saleItem.id,
            companyId: sale.companyId || order.companyId,
            costingMethod: "SIMPLE",
            picks,
          },
          transaction,
        );
      }
      await stockBatchService.refreshAverageCost(inventory, transaction);
    }

    const nextStatus =
      payload.status === "DELIVERED"
        ? "DELIVERED"
        : payload.status === "SOLD" || payload.status === "ON_LOADING"
          ? "ON_LOADING"
          : "ON_LOADING";
    order.warehouseId = warehouse.id;
    order.saleId = sale.id;
    order.approvedBy = userId;
    order.approvedAt = new Date();
    order.paymentMethodId = method.id;
    order.paidAmount = paidAmount;
    order.paymentStatus = settled.paymentStatus;
    order.status = nextStatus;
    await order.save({ transaction });
    const saved = await orderRepository.findById(id, transaction);
    return orderRepository.toPublic(saved);
  });
};

exports.updateStatus = async (id, { status }, user) => {
  const order = await orderRepository.findById(id);
  assertOrderAccess(user, order);

  const normalized =
    status === "SOLD"
      ? "ON_LOADING"
      : status === "REJECTED"
        ? "CANCELLED"
        : status;

  if (normalized === "CANCELLED") {
    if (order.saleId) {
      throw AppError.badRequest(
        "This order is already on sales. Open the sale if you need to cancel it there.",
      );
    }
    if (!["PENDING", "CANCELLED"].includes(order.status)) {
      throw AppError.badRequest("Only pending orders can be rejected");
    }
    order.status = "CANCELLED";
    const saved = await orderRepository.save(order);
    return orderRepository.toPublic(saved);
  }

  if (!order.saleId) {
    throw AppError.badRequest("Add the order to sales before changing this status");
  }
  if (!["ON_LOADING", "DELIVERED"].includes(normalized)) {
    throw AppError.badRequest("Status must be sold or sent");
  }
  order.status = normalized;
  const saved = await orderRepository.save(order);
  return orderRepository.toPublic(saved);
};

exports.recordPayment = async (id, payload, user) => {
  return sequelize.transaction(async (transaction) => {
    const order = await orderRepository.findByIdForUpdate(id, transaction);
    assertOrderAccess(user, order);
    if (!order.saleId) {
      throw AppError.badRequest("Add the order to sales before recording payment");
    }

    const sale = await Sale.findByPk(order.saleId, { transaction });
    if (!sale) {
      throw AppError.badRequest("Linked sale was not found for this order");
    }

    const vatTotal = vat.apply(order.subtotal).totalAmount;
    let dueTotal = decimal.money(sale.totalAmount || order.totalAmount || vatTotal);
    if (decimal.cmpMoney(dueTotal, order.subtotal) === 0) {
      dueTotal = vatTotal;
    }
    order.totalAmount = dueTotal;
    sale.totalAmount = dueTotal;

    const previousPaid = decimal.money(
      Math.max(
        Number(sale.paidAmount || 0),
        Number(order.paidAmount || 0),
      ),
    );
    let remaining = decimal.subMoney(dueTotal, previousPaid);
    if (decimal.cmpMoney(remaining, 0) < 0) {
      remaining = decimal.money(0);
    }

    const method = await resolvePaymentMethod(payload.paymentMethodId, user);
    order.paymentMethodId = method.id;

    // Pay remaining / settle in full whenever requested or amount covers balance.
    const rawAmount = decimal.money(payload.amount || 0);
    const settleFull =
      payload.payRemaining === true ||
      payload.payRemaining === "true" ||
      decimal.cmpMoney(rawAmount, remaining) >= 0 ||
      decimal.cmpMoney(remaining, 0) <= 0;

    const nextPaid = settleFull
      ? dueTotal
      : decimal.addMoney(previousPaid, rawAmount);

    const settled = orderRepository.settlePaid(dueTotal, nextPaid);
    // Never leave a tiny leftover when user meant to finish payment.
    const finalPaid =
      settleFull || decimal.cmpMoney(decimal.subMoney(dueTotal, settled.paid), "0.05") <= 0
        ? dueTotal
        : settled.paid;

    order.paidAmount = finalPaid;
    order.paymentStatus = orderRepository.paymentStatusOf(dueTotal, finalPaid);
    sale.paidAmount = finalPaid;
    sale.paymentMethod = method.name;
    await order.save({ transaction });
    await sale.save({ transaction });

    const saved = await orderRepository.findById(id, transaction);
    return orderRepository.toPublic(saved);
  });
};
