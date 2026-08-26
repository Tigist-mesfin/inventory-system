const crypto = require("crypto");
const sequelize = require("../../config/db");
const { Op } = require("sequelize");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const { nextDocumentNumber } = require("../../shared/helpers/documentNumber.helper");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const models = require("../../database/models");
const purchaseOrderRepository = require("./purchase-order.repository");
const tenant = require("../../shared/helpers/tenant.helper");

const {
  Product,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  StockReceipt,
  StockReceiptItem,
  Warehouse,
  SupplierPayment,
} = models;

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const uniqueProducts = (items) => {
  const ids = items.map((i) => i.productId);
  if (new Set(ids).size !== ids.length) {
    throw AppError.badRequest("Duplicate products are not allowed on a purchase order");
  }
};

const assertSupplier = async (supplierId, user) => {
  const supplier = await Supplier.findByPk(supplierId);
  tenant.assertOwned(user, supplier, "Supplier not found");
  if (supplier.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot order from an inactive supplier");
  }
  return supplier;
};

const resolveSupplier = async (payload, user) => {
  if (payload.supplierId) {
    await assertSupplier(payload.supplierId, user);
    return { supplierId: payload.supplierId, walkInNote: null };
  }
  const walkInName = String(payload.walkInName || "").trim();
  if (!walkInName) {
    throw AppError.badRequest("Choose a registered supplier or enter a walk-in name");
  }
  const companyId = tenant.companyIdOf(user);
  const [supplier] = await Supplier.findOrCreate({
    where: { name: "Walk-in", ...(companyId ? { companyId } : {}) },
    defaults: {
      name: "Walk-in",
      status: "ACTIVE",
      contactPerson: "Walk-in",
      companyId,
    },
  });
  return { supplierId: supplier.id, walkInNote: `Walk-in: ${walkInName}` };
};

const buildLines = async (items) => {
  uniqueProducts(items);
  const lines = [];
  let subtotal = decimal.money(0);
  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    if (!product) throw AppError.badRequest("Product not found");
    const quantity = decimal.qty(item.quantity);
    const unitPrice = decimal.money(item.unitPrice);
    const totalPrice = decimal.lineTotal(quantity, unitPrice, 0);
    subtotal = decimal.addMoney(subtotal, totalPrice);
    lines.push({ productId: product.id, quantity, unitPrice, totalPrice });
  }
  return { lines, subtotal };
};

const headerTotals = (subtotal, taxAmount, discountAmount) => {
  const tax = decimal.money(taxAmount || 0);
  const discount = decimal.money(discountAmount || 0);
  const total = decimal.subMoney(decimal.addMoney(subtotal, tax), discount);
  if (decimal.cmpMoney(total, 0) < 0) {
    throw AppError.badRequest("Purchase order total cannot be negative");
  }
  return { taxAmount: tax, discountAmount: discount, totalAmount: total };
};

const assertDraftEditable = (po) => {
  if (!["DRAFT", "SUBMITTED", "APPROVED"].includes(po.status)) {
    throw AppError.badRequest("This purchase order can no longer be edited");
  }
  const received = (po.items || []).some(
    (item) => decimal.cmpQty(item.receivedQuantity || 0, 0) > 0,
  );
  if (received) {
    throw AppError.badRequest("Cannot edit a purchase order that has receipts");
  }
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = purchaseOrderRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  if (query.productId) {
    const itemRows = await PurchaseOrderItem.findAll({
      attributes: ["purchaseOrderId"],
      where: { productId: query.productId },
      raw: true,
    });
    where.id = { [Op.in]: itemRows.map((row) => row.purchaseOrderId) };
  }
  const { rows, count } = await purchaseOrderRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("purchaseOrders", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const po = await purchaseOrderRepository.findById(id);
  tenant.assertOwned(user, po, "Purchase order not found");
  return purchaseOrderRepository.toPublic(po);
};

exports.create = async (payload, user) => {
  const userId = user.id;
  const { supplierId, walkInNote } = await resolveSupplier(payload, user);
  const { lines, subtotal } = await buildLines(payload.items);
  const totals = headerTotals(subtotal, payload.taxAmount, payload.discountAmount);
  const notes = [walkInNote, emptyToNull(payload.notes)].filter(Boolean).join(" — ") || null;

  return sequelize.transaction(async (transaction) => {
    const orderNumber = await nextDocumentNumber("PURCHASE_ORDER", transaction);
    const paid = decimal.money(payload.paidAmount || 0);
    if (decimal.cmpMoney(paid, totals.totalAmount) > 0) {
      throw AppError.badRequest("Paid amount cannot exceed the purchase total");
    }
    const paymentMethod = String(payload.paymentMethod || "").trim();
    if (!paymentMethod) {
      throw AppError.badRequest("Choose a payment method");
    }

    const po = await purchaseOrderRepository.create(
      {
        supplierId,
        createdBy: userId,
        companyId: tenant.companyIdOf(user),
        orderNumber,
        orderDate: payload.orderDate || new Date(),
        expectedDate: payload.expectedDate || null,
        dueDate: payload.dueDate || null,
        subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        paidAmount: paid,
        paymentMethod,
        status: "DRAFT",
        notes,
      },
      transaction,
    );
    await purchaseOrderRepository.replaceItems(po.id, lines, transaction);
    if (decimal.cmpMoney(paid, 0) > 0) {
      await SupplierPayment.create(
        {
          supplierId,
          purchaseOrderId: po.id,
          recordedBy: userId,
          companyId: tenant.companyIdOf(user),
          amount: paid,
          method: paymentMethod,
          paidAt: new Date(),
        },
        { transaction },
      );
    }
    const saved = await purchaseOrderRepository.findById(po.id, transaction);
    return purchaseOrderRepository.toPublic(saved);
  });
};

exports.update = async (id, payload) => {
  const po = await purchaseOrderRepository.findById(id);
  if (!po) throw AppError.notFound("Purchase order not found");
  assertDraftEditable(po);

  if (payload.supplierId) await assertSupplier(payload.supplierId);
  let lines = null;
  let subtotal = decimal.money(po.subtotal);
  if (payload.items) {
    const built = await buildLines(payload.items);
    lines = built.lines;
    subtotal = built.subtotal;
  }
  const totals = headerTotals(
    subtotal,
    payload.taxAmount !== undefined ? payload.taxAmount : po.taxAmount,
    payload.discountAmount !== undefined ? payload.discountAmount : po.discountAmount,
  );

  return sequelize.transaction(async (transaction) => {
    const locked = await purchaseOrderRepository.findByIdForUpdate(id, transaction);
    assertDraftEditable(locked);
    if (payload.supplierId) locked.supplierId = payload.supplierId;
    if (payload.orderDate) locked.orderDate = payload.orderDate;
    if (payload.expectedDate !== undefined) locked.expectedDate = payload.expectedDate;
    if (payload.dueDate !== undefined) locked.dueDate = payload.dueDate;
    if (payload.notes !== undefined) locked.notes = emptyToNull(payload.notes);
    locked.subtotal = subtotal;
    locked.taxAmount = totals.taxAmount;
    locked.discountAmount = totals.discountAmount;
    locked.totalAmount = totals.totalAmount;
    await locked.save({ transaction });
    if (lines) await purchaseOrderRepository.replaceItems(id, lines, transaction);
    const saved = await purchaseOrderRepository.findById(id, transaction);
    return purchaseOrderRepository.toPublic(saved);
  });
};

exports.cancel = async (id) => {
  const po = await purchaseOrderRepository.findById(id);
  if (!po) throw AppError.notFound("Purchase order not found");
  if (!["DRAFT", "SUBMITTED", "APPROVED"].includes(po.status)) {
    throw AppError.badRequest("This purchase order cannot be cancelled");
  }
  const received = (po.items || []).some(
    (item) => decimal.cmpQty(item.receivedQuantity || 0, 0) > 0,
  );
  if (received) {
    throw AppError.badRequest("Cannot cancel a purchase order that has receipts");
  }
  po.status = "CANCELLED";
  const saved = await purchaseOrderRepository.save(po);
  return purchaseOrderRepository.toPublic(saved);
};

const assertOwner = (user) => {
  if (!tenant.isOwner(user)) {
    throw AppError.forbidden("Only the company owner can change purchase delivery status");
  }
};

const assertWarehouse = async (warehouseId, transaction) => {
  const warehouse = await Warehouse.findByPk(warehouseId, { transaction });
  if (!warehouse) throw AppError.badRequest("Warehouse not found");
  if (warehouse.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot deliver into an inactive warehouse");
  }
  return warehouse;
};

const lockKey = (productId, warehouseId) => `${productId}|${warehouseId}`;

const removeFromWarehouse = async (
  { productId, warehouseId, quantity, userId, notes },
  transaction,
) => {
  if (decimal.cmpQty(quantity, 0) <= 0) return;
  const locked = await inventoryPosting.lockInventories(
    [{ productId, warehouseId }],
    transaction,
  );
  await inventoryPosting.postOutbound(
    {
      inventory: locked[lockKey(productId, warehouseId)],
      quantity,
      type: "ADJUSTMENT_OUT",
      createdBy: userId,
      referenceType: "PURCHASE_ORDER_ITEM",
      referenceId: crypto.randomUUID(),
      notes,
    },
    transaction,
  );
};

const postReceiptIntoWarehouse = async (
  { warehouseId, purchaseOrderId, items, userId, lockedInventories },
  transaction,
) => {
  const receiptNumber = await nextDocumentNumber("STOCK_RECEIPT", transaction);
  const receipt = await StockReceipt.create(
    {
      purchaseOrderId,
      warehouseId,
      receivedBy: userId,
      receiptNumber,
      receiptDate: new Date(),
      status: "DRAFT",
      notes: "Purchase delivery to store",
    },
    { transaction },
  );

  for (const item of items) {
    const quantity = decimal.qty(item.quantity);
    await StockReceiptItem.create(
      {
        stockReceiptId: receipt.id,
        purchaseOrderItemId: item.id,
        productId: item.productId,
        quantity,
        unitCost: decimal.money(item.unitPrice),
      },
      { transaction },
    );

    const nextReceived = decimal.addQty(item.receivedQuantity || 0, quantity);
    if (decimal.cmpQty(nextReceived, item.quantity) > 0) {
      throw AppError.badRequest("Cannot over-receive a purchase order line");
    }
    item.receivedQuantity = nextReceived;
    item.deliveryStatus = "DELIVERED";
    item.warehouseId = warehouseId;
    await item.save({ transaction });

    const inventory =
      lockedInventories[lockKey(item.productId, warehouseId)];
    await inventoryPosting.postInbound(
      {
        inventory,
        quantity,
        unitCost: item.unitPrice,
        type: "PURCHASE",
        createdBy: userId,
        referenceType: "STOCK_RECEIPT",
        referenceId: receipt.id,
        notes: receiptNumber,
      },
      transaction,
    );
  }

  receipt.status = "COMPLETED";
  await receipt.save({ transaction });
};

const recalcPurchaseOrder = async (purchaseOrderId, transaction) => {
  const po = await PurchaseOrder.findByPk(purchaseOrderId, {
    include: [{ model: PurchaseOrderItem, as: "items" }],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  if (!po || po.status === "CANCELLED") return po;

  let subtotal = decimal.money(0);
  for (const item of po.items || []) {
    subtotal = decimal.addMoney(subtotal, item.totalPrice);
  }
  const totals = headerTotals(subtotal, po.taxAmount, po.discountAmount);
  po.subtotal = subtotal;
  po.taxAmount = totals.taxAmount;
  po.discountAmount = totals.discountAmount;
  po.totalAmount = totals.totalAmount;

  const allDelivered = (po.items || []).every(
    (item) => item.deliveryStatus === "DELIVERED",
  );
  const anyDelivered = (po.items || []).some(
    (item) => item.deliveryStatus === "DELIVERED",
  );
  po.status = allDelivered
    ? "COMPLETED"
    : anyDelivered
      ? "PARTIALLY_RECEIVED"
      : ["COMPLETED", "PARTIALLY_RECEIVED"].includes(po.status)
        ? "DRAFT"
        : po.status;
  await po.save({ transaction });
  return po;
};

const applyItemDelivery = async (
  item,
  { deliveryStatus, warehouseId, quantity },
  userId,
  transaction,
) => {
  const nextQty =
    quantity !== undefined ? decimal.qty(quantity) : decimal.qty(item.quantity);
  const nextStatus = deliveryStatus || item.deliveryStatus || "NOT_DELIVERED";
  const wasDelivered = item.deliveryStatus === "DELIVERED";
  const oldWarehouseId = item.warehouseId;
  const oldReceived = decimal.qty(item.receivedQuantity || 0);

  if (nextStatus === "DELIVERED" && !warehouseId && !item.warehouseId) {
    throw AppError.badRequest("Choose a warehouse to mark this item delivered");
  }
  const nextWarehouseId =
    nextStatus === "DELIVERED"
      ? warehouseId || item.warehouseId
      : warehouseId !== undefined
        ? warehouseId || null
        : item.warehouseId;

  if (nextWarehouseId) await assertWarehouse(nextWarehouseId, transaction);

  const sameStock =
    wasDelivered &&
    nextStatus === "DELIVERED" &&
    oldWarehouseId === nextWarehouseId &&
    decimal.cmpQty(oldReceived, nextQty) === 0;

  if (!sameStock && wasDelivered && oldWarehouseId && decimal.cmpQty(oldReceived, 0) > 0) {
    await removeFromWarehouse(
      {
        productId: item.productId,
        warehouseId: oldWarehouseId,
        quantity: oldReceived,
        userId,
        notes: `Reverse delivery ${item.id}`,
      },
      transaction,
    );
    item.receivedQuantity = 0;
  }

  item.quantity = nextQty;
  item.totalPrice = decimal.lineTotal(nextQty, item.unitPrice, 0);
  item.deliveryStatus = nextStatus;
  item.warehouseId = nextWarehouseId || null;

  if (nextStatus !== "DELIVERED") {
    if (!wasDelivered || !sameStock) item.receivedQuantity = 0;
    await item.save({ transaction });
    return;
  }

  if (!sameStock) {
    const locked = await inventoryPosting.lockInventories(
      [{ productId: item.productId, warehouseId: nextWarehouseId }],
      transaction,
    );
    item.receivedQuantity = 0;
    await item.save({ transaction });
    await postReceiptIntoWarehouse(
      {
        warehouseId: nextWarehouseId,
        purchaseOrderId: item.purchaseOrderId,
        items: [item],
        userId,
        lockedInventories: locked,
      },
      transaction,
    );
  } else {
    await item.save({ transaction });
  }
};

exports.undeliveredSummary = async (user) => {
  const poWhere = { status: { [Op.ne]: "CANCELLED" } };
  tenant.applyCompany(poWhere, user);
  return purchaseOrderRepository.deliverySummary(poWhere);
};

exports.updateItemDelivery = async (itemId, payload, user) => {
  assertOwner(user);
  const existing = await purchaseOrderRepository.findItemById(itemId);
  if (!existing) throw AppError.notFound("Purchase item not found");
  tenant.assertOwned(user, existing.purchaseOrder, "Purchase item not found");
  if (existing.purchaseOrder?.status === "CANCELLED") {
    throw AppError.badRequest("Cannot update a cancelled purchase");
  }

  return sequelize.transaction(async (transaction) => {
    const item = await PurchaseOrderItem.findByPk(itemId, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    await applyItemDelivery(item, payload, user.id, transaction);
    await recalcPurchaseOrder(item.purchaseOrderId, transaction);
    const po = await purchaseOrderRepository.findById(item.purchaseOrderId, transaction);
    const publicPo = purchaseOrderRepository.toPublic(po);
    return {
      item: publicPo.items.find((row) => row.id === itemId),
      purchaseOrder: publicPo,
    };
  });
};

exports.deliverAll = async ({ warehouseId }, user) => {
  assertOwner(user);
  await assertWarehouse(warehouseId);

  return sequelize.transaction(async (transaction) => {
    const pending = await PurchaseOrderItem.findAll({
      attributes: ["id"],
      where: { deliveryStatus: { [Op.ne]: "DELIVERED" } },
      include: [
        {
          model: PurchaseOrder,
          as: "purchaseOrder",
          attributes: [],
          where: { status: { [Op.ne]: "CANCELLED" } },
          required: true,
        },
      ],
      transaction,
    });
    const ids = pending.map((row) => row.id).sort();
    if (!ids.length) return { deliveredCount: 0 };

    const items = await PurchaseOrderItem.findAll({
      where: { id: ids },
      order: [["id", "ASC"]],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    const pairs = items.map((item) => ({
      productId: item.productId,
      warehouseId,
    }));
    const lockedInventories = await inventoryPosting.lockInventories(
      pairs,
      transaction,
    );

    const byPo = new Map();
    for (const item of items) {
      const list = byPo.get(item.purchaseOrderId) || [];
      list.push(item);
      byPo.set(item.purchaseOrderId, list);
    }

    for (const [purchaseOrderId, group] of byPo.entries()) {
      for (const item of group) {
        item.receivedQuantity = 0;
      }
      await postReceiptIntoWarehouse(
        {
          warehouseId,
          purchaseOrderId,
          items: group,
          userId: user.id,
          lockedInventories,
        },
        transaction,
      );
    }

    for (const purchaseOrderId of byPo.keys()) {
      await recalcPurchaseOrder(purchaseOrderId, transaction);
    }

    return { deliveredCount: items.length };
  });
};

exports.recordPayment = async (id, payload, user) => {
  const po = await purchaseOrderRepository.findById(id);
  tenant.assertOwned(user, po, "Purchase order not found");
  if (po.status === "CANCELLED") {
    throw AppError.badRequest("Cannot pay a cancelled purchase");
  }
  const method = String(payload.paymentMethod || po.paymentMethod || "").trim();
  if (!method) throw AppError.badRequest("Choose a payment method");
  const remaining = decimal.subMoney(po.totalAmount, po.paidAmount || 0);
  if (decimal.cmpMoney(remaining, 0) <= 0) {
    throw AppError.badRequest("This purchase is already paid");
  }
  const supplierPaymentService = require("./supplier-payment.service");
  await supplierPaymentService.create(
    {
      supplierId: po.supplierId,
      purchaseOrderId: id,
      amount: payload.amount,
      method,
    },
    user,
  );
  return exports.getById(id, user);
};
