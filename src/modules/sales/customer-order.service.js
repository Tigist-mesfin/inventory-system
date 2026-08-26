const sequelize = require("../../config/db");
const { Op } = require("sequelize");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const { nextDocumentNumber } = require("../../shared/helpers/documentNumber.helper");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const models = require("../../database/models");
const orderRepository = require("./customer-order.repository");
const tenant = require("../../shared/helpers/tenant.helper");

const { Product, Warehouse, PaymentMethod, Inventory, Sale, SaleItem } = models;

const uniqueProducts = (items) => {
  const ids = items.map((item) => item.productId);
  if (new Set(ids).size !== ids.length) {
    throw AppError.badRequest("Duplicate products are not allowed on an order");
  }
};

const availableOfProduct = async (productId, companyId) => {
  const where = { productId };
  if (companyId) where.companyId = companyId;
  const rows = await Inventory.findAll({ where });
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
    const product = await Product.findByPk(item.productId);
    if (!product) throw AppError.badRequest("Product not found");
    if (companyId && product.companyId !== companyId) {
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
  return products
    .map((product) => ({
      id: product.id,
      name: product.name,
      unit: product.unit,
      brand: product.brand,
      sellingPrice: product.sellingPrice,
      available: stock[product.id] || "0.000",
    }))
    .filter((row) => decimal.cmpQty(row.available, 0) > 0);
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query, { defaultLimit: 50, maxLimit: 100 });
  const where = orderRepository.searchWhere(query);
  tenant.applyCompany(where, user);
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
  tenant.assertOwned(user, order, "Order not found");
  return orderRepository.toPublic(order);
};

exports.create = async (payload, user) => {
  const companyId = tenant.requireCompanyId(user);
  const { lines, subtotal } = await buildLines(payload.items, {
    checkStock: true,
    companyId,
  });
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
        totalAmount: subtotal,
        companyId,
        paidAmount: 0,
        notes: payload.notes || null,
      },
      transaction,
    );
    await orderRepository.replaceItems(order.id, lines, transaction);
    const saved = await orderRepository.findById(order.id, transaction);
    return orderRepository.toPublic(saved);
  });
};

exports.updatePending = async (id, payload) => {
  const order = await orderRepository.findById(id);
  if (!order) throw AppError.notFound("Order not found");
  if (order.status !== "PENDING") {
    throw AppError.badRequest("Only pending orders can be edited");
  }
  const { lines, subtotal } = payload.items
    ? await buildLines(payload.items, { checkStock: true })
    : { lines: null, subtotal: order.subtotal };

  return sequelize.transaction(async (transaction) => {
    const locked = await orderRepository.findByIdForUpdate(id, transaction);
    if (payload.deliveryDate) locked.deliveryDate = payload.deliveryDate;
    if (payload.customerName) locked.customerName = payload.customerName;
    if (payload.customerPhone) locked.customerPhone = payload.customerPhone;
    if (payload.notes !== undefined) locked.notes = payload.notes || null;
    locked.subtotal = subtotal;
    locked.totalAmount = subtotal;
    await locked.save({ transaction });
    if (lines) await orderRepository.replaceItems(id, lines, transaction);
    const saved = await orderRepository.findById(id, transaction);
    return orderRepository.toPublic(saved);
  });
};

exports.approve = async (id, payload, userId) => {
  const method = await PaymentMethod.findByPk(payload.paymentMethodId);
  if (!method || method.status !== "ACTIVE") {
    throw AppError.badRequest("Payment method not found");
  }
  const warehouse = await Warehouse.findByPk(payload.warehouseId);
  if (!warehouse || warehouse.status !== "ACTIVE") {
    throw AppError.badRequest("Warehouse not found");
  }

  return sequelize.transaction(async (transaction) => {
    const order = await orderRepository.findByIdForUpdate(id, transaction);
    if (!order) throw AppError.notFound("Order not found");
    if (order.status !== "PENDING") {
      throw AppError.badRequest("Only pending orders can be approved");
    }
    if (!order.items?.length) throw AppError.badRequest("Order has no items");

    let lines = order.items;
    if (payload.items) {
      const built = await buildLines(payload.items, { checkStock: false });
      await orderRepository.replaceItems(id, built.lines, transaction);
      order.subtotal = built.subtotal;
      order.totalAmount = built.subtotal;
      lines = built.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
      }));
    }

    const paidAmount = decimal.money(payload.paidAmount || 0);
    if (decimal.cmpMoney(paidAmount, order.totalAmount) > 0) {
      throw AppError.badRequest("Paid amount cannot exceed the order total");
    }

    const invoiceNumber = await nextDocumentNumber("SALE", transaction);
    const sale = await Sale.create(
      {
        warehouseId: warehouse.id,
        createdBy: userId,
        invoiceNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        saleDate: new Date(),
        dueDate: order.deliveryDate,
        subtotal: order.totalAmount,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: order.totalAmount,
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

    const pairs = lines.map((item) => ({
      productId: item.productId,
      warehouseId: warehouse.id,
    }));
    const locked = await inventoryPosting.lockInventories(pairs, transaction);
    for (const item of lines) {
      await inventoryPosting.postOutbound(
        {
          inventory: locked[`${item.productId}|${warehouse.id}`],
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

    const nextStatus = payload.status === "DELIVERED" ? "DELIVERED" : "ON_LOADING";
    order.warehouseId = warehouse.id;
    order.saleId = sale.id;
    order.approvedBy = userId;
    order.approvedAt = new Date();
    order.paymentMethodId = method.id;
    order.paidAmount = paidAmount;
    order.paymentStatus = orderRepository.paymentStatusOf(order.totalAmount, paidAmount);
    order.status = nextStatus;
    await order.save({ transaction });
    const saved = await orderRepository.findById(id, transaction);
    return orderRepository.toPublic(saved);
  });
};

exports.updateStatus = async (id, { status }) => {
  const order = await orderRepository.findById(id);
  if (!order) throw AppError.notFound("Order not found");
  if (!order.saleId) {
    throw AppError.badRequest("Approve the order before changing delivery status");
  }
  if (!["ON_LOADING", "DELIVERED"].includes(status)) {
    throw AppError.badRequest("Status must be on loading or delivered");
  }
  order.status = status;
  const saved = await orderRepository.save(order);
  return orderRepository.toPublic(saved);
};

exports.recordPayment = async (id, payload) => {
  const order = await orderRepository.findById(id);
  if (!order) throw AppError.notFound("Order not found");
  if (!order.saleId) {
    throw AppError.badRequest("Approve the order before recording payment");
  }
  const extra = decimal.money(payload.amount);
  const nextPaid = decimal.addMoney(order.paidAmount, extra);
  if (decimal.cmpMoney(nextPaid, order.totalAmount) > 0) {
    throw AppError.badRequest("Payment would exceed the remaining balance");
  }
  if (payload.paymentMethodId) {
    const method = await PaymentMethod.findByPk(payload.paymentMethodId);
    if (!method || method.status !== "ACTIVE") {
      throw AppError.badRequest("Payment method not found");
    }
    order.paymentMethodId = method.id;
  }
  order.paidAmount = nextPaid;
  order.paymentStatus = orderRepository.paymentStatusOf(order.totalAmount, nextPaid);
  const saved = await orderRepository.save(order);
  if (order.saleId) {
    await Sale.update(
      { paidAmount: nextPaid },
      { where: { id: order.saleId } },
    );
  }
  return orderRepository.toPublic(saved);
};
