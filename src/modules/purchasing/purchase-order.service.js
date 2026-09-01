const crypto = require("crypto");
const sequelize = require("../../config/db");
const { Op } = require("sequelize");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const vat = require("../../shared/helpers/vat.helper");
const { nextDocumentNumber } = require("../../shared/helpers/documentNumber.helper");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const models = require("../../database/models");
const purchaseOrderRepository = require("./purchase-order.repository");
const tenant = require("../../shared/helpers/tenant.helper");
const stockBatchService = require("../inventory/stock-batch.service");
const excel = require("../../shared/helpers/excel.helper");
const productService = require("../catalog/product/product.service");

const {
  Product,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  StockReceipt,
  StockReceiptItem,
  Warehouse,
  SupplierPayment,
  PaymentMethod,
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

const buildLines = async (items, user) => {
  uniqueProducts(items);
  const lines = [];
  let subtotal = decimal.money(0);
  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    tenant.assertOwned(user, product, "Product not found");
    const quantity = decimal.qty(item.quantity);
    const unitPrice = decimal.money(item.unitPrice);
    const totalPrice = decimal.lineTotal(quantity, unitPrice, 0);
    subtotal = decimal.addMoney(subtotal, totalPrice);
    lines.push({ productId: product.id, quantity, unitPrice, totalPrice });
  }
  return { lines, subtotal };
};

const headerTotals = (subtotal, discountAmount) => vat.apply(subtotal, discountAmount);

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
  const { lines, subtotal } = await buildLines(payload.items, user);
  const totals = headerTotals(subtotal, payload.discountAmount);
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

exports.update = async (id, payload, user) => {
  const po = await purchaseOrderRepository.findById(id);
  tenant.assertOwned(user, po, "Purchase order not found");
  assertDraftEditable(po);

  if (payload.supplierId) await assertSupplier(payload.supplierId, user);
  let lines = null;
  let subtotal = decimal.money(po.subtotal);
  if (payload.items) {
    const built = await buildLines(payload.items, user);
    lines = built.lines;
    subtotal = built.subtotal;
  }
  const totals = headerTotals(
    subtotal,
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

exports.cancel = async (id, user) => {
  const po = await purchaseOrderRepository.findById(id);
  tenant.assertOwned(user, po, "Purchase order not found");
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

const assertWarehouse = async (warehouseId, user, transaction) => {
  const warehouse = await Warehouse.findByPk(warehouseId, { transaction });
  tenant.assertOwned(user, warehouse, "Warehouse not found");
  if (warehouse.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot deliver into an inactive warehouse");
  }
  return warehouse;
};

const lockKey = (productId, warehouseId) => `${productId}|${warehouseId}`;

const removeFromWarehouse = async (
  { productId, warehouseId, quantity, userId, notes, purchaseOrderItemId },
  transaction,
) => {
  if (decimal.cmpQty(quantity, 0) <= 0) return;
  const locked = await inventoryPosting.lockInventories(
    [{ productId, warehouseId }],
    transaction,
  );
  const inventory = locked[lockKey(productId, warehouseId)];
  if (purchaseOrderItemId) {
    await stockBatchService.releasePurchaseBatches(
      { purchaseOrderItemId, warehouseId, quantity },
      transaction,
    );
  }
  await inventoryPosting.postOutbound(
    {
      inventory,
      quantity,
      type: "ADJUSTMENT_OUT",
      createdBy: userId,
      referenceType: "PURCHASE_ORDER_ITEM",
      referenceId: crypto.randomUUID(),
      notes,
    },
    transaction,
  );
  await stockBatchService.refreshAverageCost(inventory, transaction);
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

  let postedCount = 0;
  for (const item of items) {
    const requestedDeliver = item.deliverQuantity;
    delete item.deliverQuantity;
    const leftover = decimal.subQty(item.quantity, item.receivedQuantity || 0);
    const quantity = decimal.qty(
      requestedDeliver != null ? requestedDeliver : leftover,
    );
    if (decimal.cmpQty(quantity, 0) <= 0) continue;
    if (decimal.cmpQty(quantity, leftover) > 0) {
      throw AppError.badRequest("Cannot over-receive a purchase order line");
    }

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
    item.warehouseId = warehouseId;
    item.deliveryStatus =
      decimal.cmpQty(nextReceived, item.quantity) >= 0
        ? "DELIVERED"
        : item.deliveryStatus === "ON_LOADING"
          ? "ON_LOADING"
          : "NOT_DELIVERED";
    await item.save({
      transaction,
      fields: ["receivedQuantity", "warehouseId", "deliveryStatus"],
    });

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
    const po = await PurchaseOrder.findByPk(purchaseOrderId, { transaction });
    await stockBatchService.createPurchaseBatch(
      {
        companyId: inventory.companyId || po?.companyId,
        productId: item.productId,
        warehouseId,
        purchaseOrderId,
        purchaseOrderItemId: item.id,
        purchaseDate: po?.orderDate || receipt.receiptDate || new Date(),
        unitCost: item.unitPrice,
        quantity,
      },
      transaction,
    );
    await stockBatchService.refreshAverageCost(inventory, transaction);
    postedCount += 1;
  }

  if (postedCount === 0) {
    await receipt.destroy({ transaction });
    return;
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
  const totals = headerTotals(subtotal, po.discountAmount);
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
  user,
  transaction,
) => {
  const userId = user.id;
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

  if (nextWarehouseId) await assertWarehouse(nextWarehouseId, user, transaction);

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
        purchaseOrderItemId: item.id,
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

exports.listUndeliveredItems = async (user) => {
  const poWhere = { status: { [Op.ne]: "CANCELLED" } };
  tenant.applyCompany(poWhere, user);
  return purchaseOrderRepository.listUndeliveredItems(poWhere);
};

const leftoverOf = (item) =>
  decimal.subQty(item.quantity, item.receivedQuantity || 0);

exports.lockPendingItemsForProduct = async (productId, user, transaction) => {
  const pending = await PurchaseOrderItem.findAll({
    attributes: ["id"],
    where: {
      productId,
      deliveryStatus: { [Op.ne]: "DELIVERED" },
    },
    include: [
      {
        model: PurchaseOrder,
        as: "purchaseOrder",
        attributes: [],
        where: {
          status: { [Op.ne]: "CANCELLED" },
          companyId: tenant.requireCompanyId(user),
        },
        required: true,
      },
    ],
    transaction,
  });
  const ids = pending.map((row) => row.id).sort();
  if (!ids.length) return [];
  return PurchaseOrderItem.findAll({
    where: { id: ids },
    order: [["id", "ASC"]],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
};

exports.deliverQuantityFromPurchases = async (
  { productId, warehouseId, quantity },
  user,
  outerTransaction,
) => {
  const need = decimal.qty(quantity);
  if (decimal.cmpQty(need, 0) <= 0) {
    return { delivered: decimal.qty(0) };
  }

  await assertWarehouse(warehouseId, user, outerTransaction);
  tenant.assertWarehouseAccess(user, warehouseId);

  const product = await Product.findByPk(productId, {
    transaction: outerTransaction,
  });
  tenant.assertOwned(user, product, "Product not found");

  const run = async (transaction) => {
    const pending = await PurchaseOrderItem.findAll({
      where: {
        productId,
        deliveryStatus: { [Op.ne]: "DELIVERED" },
      },
      include: [
        {
          model: PurchaseOrder,
          as: "purchaseOrder",
          attributes: ["id", "orderDate", "companyId", "status"],
          where: {
            status: { [Op.ne]: "CANCELLED" },
            companyId: tenant.requireCompanyId(user),
          },
          required: true,
        },
      ],
      order: [
        [{ model: PurchaseOrder, as: "purchaseOrder" }, "orderDate", "ASC"],
        ["id", "ASC"],
      ],
      transaction,
    });

    const available = pending.reduce(
      (sum, item) => decimal.addQty(sum, leftoverOf(item)),
      decimal.qty(0),
    );
    if (decimal.cmpQty(need, available) > 0) {
      throw AppError.badRequest(
        `Only ${available} undelivered ${product.unit || "units"} remain for this item`,
      );
    }

    const ids = pending.map((row) => row.id).sort();
    if (!ids.length) {
      throw AppError.badRequest(
        `Only ${available} undelivered ${product.unit || "units"} remain for this item`,
      );
    }

    const lockedItems = await PurchaseOrderItem.findAll({
      where: { id: ids },
      order: [["id", "ASC"]],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    const lockedMap = new Map(lockedItems.map((row) => [row.id, row]));
    const ordered = pending
      .map((row) => lockedMap.get(row.id))
      .filter(Boolean);

    const lockedInventories = await inventoryPosting.lockInventories(
      [{ productId, warehouseId }],
      transaction,
    );

    let remainingNeed = need;
    const byPo = new Map();
    for (const item of ordered) {
      if (decimal.cmpQty(remainingNeed, 0) <= 0) break;
      const leftover = leftoverOf(item);
      if (decimal.cmpQty(leftover, 0) <= 0) continue;
      const take =
        decimal.cmpQty(leftover, remainingNeed) <= 0 ? leftover : remainingNeed;
      item.deliverQuantity = take;
      const list = byPo.get(item.purchaseOrderId) || [];
      list.push(item);
      byPo.set(item.purchaseOrderId, list);
      remainingNeed = decimal.subQty(remainingNeed, take);
    }

    if (decimal.cmpQty(remainingNeed, 0) > 0) {
      throw AppError.badRequest(
        `Only ${decimal.subQty(need, remainingNeed)} undelivered ${product.unit || "units"} could be delivered`,
      );
    }

    for (const [purchaseOrderId, group] of byPo.entries()) {
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

    return { delivered: need };
  };

  if (outerTransaction) return run(outerTransaction);
  return sequelize.transaction(run);
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
    await applyItemDelivery(item, payload, user, transaction);
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
  await assertWarehouse(warehouseId, user);

  return sequelize.transaction(async (transaction) => {
    const pending = await PurchaseOrderItem.findAll({
      attributes: ["id"],
      where: { deliveryStatus: { [Op.ne]: "DELIVERED" } },
      include: [
        {
          model: PurchaseOrder,
          as: "purchaseOrder",
          attributes: [],
          where: {
            status: { [Op.ne]: "CANCELLED" },
            companyId: tenant.requireCompanyId(user),
          },
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

const parseImportNumber = (value) => {
  const text = String(value || "").replace(/,/g, "").trim();
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

const parseImportStatus = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "NOT_DELIVERED";
  if (text.includes("load")) return "ON_LOADING";
  if (text.includes("deliver") && !text.includes("not")) return "DELIVERED";
  return "NOT_DELIVERED";
};

const matchPaymentMethod = (value, methods) => {
  const needle = String(value || "").trim().toLowerCase();
  if (!needle) return null;
  return (
    methods.find((row) => row.name.toLowerCase() === needle)?.name ||
    methods.find((row) => row.name.toLowerCase().includes(needle))?.name ||
    null
  );
};

const findImportSupplier = async (name, user) => {
  const text = String(name || "").trim();
  if (!text) return null;
  const where = { status: "ACTIVE", name: text };
  tenant.applyCompany(where, user);
  const supplier = await Supplier.findOne({ where });
  if (!supplier || supplier.name === "Walk-in") return null;
  return supplier;
};

const resolveImportProduct = async (name, unit, unitPrice, user, cache) => {
  const key = String(name).trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const where = { name: String(name).trim() };
  tenant.applyCompany(where, user);
  const existing = await Product.findOne({ where });
  if (existing) {
    if (existing.status !== "ACTIVE") {
      throw AppError.badRequest(`${name} is inactive`);
    }
    cache.set(key, existing);
    return existing;
  }
  const created = await productService.create(
    {
      name: String(name).trim(),
      unit: unit || "PCS",
      purchasePrice: unitPrice || 0,
      sellingPrice: 0,
    },
    user,
  );
  cache.set(key, created);
  return created;
};

exports.buildImportTemplate = () => excel.buildPurchaseTemplateBuffer();

exports.importFromExcel = async (buffer, user) => {
  if (!buffer || !buffer.length) {
    throw AppError.badRequest("Upload an Excel file");
  }
  let rows;
  try {
    rows = excel.parsePurchaseRows(buffer);
  } catch (err) {
    throw AppError.badRequest("Could not read that Excel file");
  }
  if (!rows.length) {
    throw AppError.badRequest("The Excel file has no purchase rows");
  }
  if (rows.length > 300) {
    throw AppError.badRequest("Import at most 300 rows at a time");
  }

  const methods = await PaymentMethod.findAll({
    where: tenant.applyCompany({ status: "ACTIVE" }, user),
    order: [["name", "ASC"]],
  });
  const defaultMethod = methods[0]?.name || "Cash";
  const warehouses = await Warehouse.findAll({
    where: tenant.applyCompany({ status: "ACTIVE" }, user),
    order: [["name", "ASC"]],
  });
  const defaultWarehouseId = warehouses[0]?.id || null;
  const productCache = new Map();
  const imported = [];
  const skipped = [];

  for (const row of rows) {
    try {
      const itemName = String(row.itemName || "").trim();
      if (!itemName) {
        skipped.push({ rowNumber: row.rowNumber, reason: "No item name" });
        continue;
      }

      let quantity = parseImportNumber(row.quantity);
      if (quantity === null || quantity <= 0) quantity = 1;
      let unitPrice = parseImportNumber(row.unitPrice);
      const amount = parseImportNumber(row.amount);
      const costWithVat = parseImportNumber(row.costWithVat);
      if (unitPrice === null || unitPrice < 0) unitPrice = 0;
      if (unitPrice === 0 && amount && amount > 0) {
        unitPrice = Number((amount / quantity).toFixed(2));
      } else if (unitPrice === 0 && costWithVat && costWithVat > 0) {
        unitPrice = Number((costWithVat / 1.15 / quantity).toFixed(2));
      }

      const product = await resolveImportProduct(
        itemName,
        String(row.unit || "").trim(),
        unitPrice,
        user,
        productCache,
      );
      const supplier = await findImportSupplier(row.boughtFrom, user);
      const walkInName = String(row.boughtFrom || "").trim() || "Imported";
      const paymentMethod = matchPaymentMethod(row.method, methods) || defaultMethod;
      const line = decimal.lineTotal(quantity, unitPrice, 0);
      const totals = vat.apply(line, 0);
      let paid = parseImportNumber(row.paid);
      if (paid === null || paid < 0) paid = 0;
      if (decimal.cmpMoney(paid, totals.totalAmount) > 0) {
        paid = Number(totals.totalAmount);
      }
      const notes = [
        "Imported from Excel",
        row.staff ? `Staff: ${row.staff}` : null,
      ]
        .filter(Boolean)
        .join(" — ");

      const purchaseOrder = await exports.create(
        {
          ...(supplier ? { supplierId: supplier.id } : { walkInName }),
          paymentMethod,
          paidAmount: paid,
          orderDate: parseImportDate(row.date),
          notes,
          items: [{ productId: product.id, quantity, unitPrice }],
        },
        user,
      );

      const status = parseImportStatus(row.status);
      if (tenant.isOwner(user) && status !== "NOT_DELIVERED" && purchaseOrder.items?.[0]?.id) {
        if (status === "DELIVERED" && !defaultWarehouseId) {
          skipped.push({
            rowNumber: row.rowNumber,
            reason: "Saved, but no warehouse to mark delivered",
          });
        } else {
          await exports.updateItemDelivery(
            purchaseOrder.items[0].id,
            {
              deliveryStatus: status,
              warehouseId: status === "DELIVERED" ? defaultWarehouseId : null,
            },
            user,
          );
        }
      }

      imported.push({
        rowNumber: row.rowNumber,
        orderNumber: purchaseOrder.orderNumber,
        itemName,
      });
    } catch (err) {
      skipped.push({
        rowNumber: row.rowNumber,
        reason: err.statusCode && err.message ? err.message : "Could not import this row",
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
