const sequelize = require("../../config/db");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const { nextDocumentNumber } = require("../../shared/helpers/documentNumber.helper");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const models = require("../../database/models");
const stockReceiptRepository = require("./stock-receipt.repository");
const tenant = require("../../shared/helpers/tenant.helper");

const { Product, Warehouse, PurchaseOrder, PurchaseOrderItem } = models;

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const assertWarehouse = async (warehouseId) => {
  const warehouse = await Warehouse.findByPk(warehouseId);
  if (!warehouse) throw AppError.badRequest("Warehouse not found");
  if (warehouse.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot receive into an inactive warehouse");
  }
};

const normalizeItems = async (items, purchaseOrderId) => {
  const lines = [];
  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    if (!product) throw AppError.badRequest("Product not found");
    let purchaseOrderItemId = item.purchaseOrderItemId || null;
    if (purchaseOrderId && !purchaseOrderItemId) {
      const poItem = await PurchaseOrderItem.findOne({
        where: { purchaseOrderId, productId: item.productId },
      });
      purchaseOrderItemId = poItem ? poItem.id : null;
    }
    lines.push({
      productId: item.productId,
      purchaseOrderItemId,
      quantity: decimal.qty(item.quantity),
      unitCost: decimal.money(item.unitCost),
      batchNumber: emptyToNull(item.batchNumber) ?? null,
      expiryDate: item.expiryDate || null,
    });
  }
  return lines;
};

const refreshPurchaseOrderStatus = async (purchaseOrderId, transaction) => {
  const po = await PurchaseOrder.findByPk(purchaseOrderId, {
    include: [{ model: PurchaseOrderItem, as: "items" }],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!po) return;
  const allReceived = po.items.every(
    (item) => decimal.cmpQty(item.receivedQuantity, item.quantity) >= 0,
  );
  const anyReceived = po.items.some(
    (item) => decimal.cmpQty(item.receivedQuantity, 0) > 0,
  );
  po.status = allReceived
    ? "COMPLETED"
    : anyReceived
      ? "PARTIALLY_RECEIVED"
      : po.status;
  await po.save({ transaction });
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = stockReceiptRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  tenant.applyWarehouse(where, user);
  const { rows, count } = await stockReceiptRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("receipts", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const receipt = await stockReceiptRepository.findById(id);
  tenant.assertOwned(user, receipt, "Stock receipt not found");
  return stockReceiptRepository.toPublic(receipt);
};

exports.create = async (payload, user) => {
  tenant.assertWarehouseAccess(user, payload.warehouseId);
  await assertWarehouse(payload.warehouseId);
  if (payload.purchaseOrderId) {
    const po = await PurchaseOrder.findByPk(payload.purchaseOrderId);
    if (!po) throw AppError.badRequest("Purchase order not found");
    if (po.status === "CANCELLED") {
      throw AppError.badRequest("Cannot receive against a cancelled purchase order");
    }
  }
  const lines = await normalizeItems(payload.items, payload.purchaseOrderId || null);

  return sequelize.transaction(async (transaction) => {
    const receiptNumber = await nextDocumentNumber("STOCK_RECEIPT", transaction);
    const receipt = await stockReceiptRepository.create(
      {
        purchaseOrderId: payload.purchaseOrderId || null,
        warehouseId: payload.warehouseId,
        companyId: tenant.companyIdOf(user),
        receivedBy: user.id,
        receiptNumber,
        receiptDate: payload.receiptDate || new Date(),
        status: "DRAFT",
        notes: emptyToNull(payload.notes) ?? null,
      },
      transaction,
    );
    await stockReceiptRepository.replaceItems(receipt.id, lines, transaction);
    const saved = await stockReceiptRepository.findById(receipt.id, transaction);
    return stockReceiptRepository.toPublic(saved);
  });
};

exports.update = async (id, payload) => {
  const receipt = await stockReceiptRepository.findById(id);
  if (!receipt) throw AppError.notFound("Stock receipt not found");
  if (receipt.status !== "DRAFT") {
    throw AppError.badRequest("Only draft receipts can be updated");
  }
  if (payload.warehouseId) await assertWarehouse(payload.warehouseId);
  const purchaseOrderId =
    payload.purchaseOrderId !== undefined
      ? payload.purchaseOrderId
      : receipt.purchaseOrderId;
  const lines = payload.items
    ? await normalizeItems(payload.items, purchaseOrderId)
    : null;

  return sequelize.transaction(async (transaction) => {
    const locked = await stockReceiptRepository.findByIdForUpdate(id, transaction);
    if (locked.status !== "DRAFT") {
      throw AppError.badRequest("Only draft receipts can be updated");
    }
    if (payload.warehouseId) locked.warehouseId = payload.warehouseId;
    if (payload.purchaseOrderId !== undefined) {
      locked.purchaseOrderId = payload.purchaseOrderId || null;
    }
    if (payload.receiptDate) locked.receiptDate = payload.receiptDate;
    if (payload.notes !== undefined) locked.notes = emptyToNull(payload.notes);
    await locked.save({ transaction });
    if (lines) await stockReceiptRepository.replaceItems(id, lines, transaction);
    const saved = await stockReceiptRepository.findById(id, transaction);
    return stockReceiptRepository.toPublic(saved);
  });
};

exports.complete = async (id, userId) => {
  return sequelize.transaction(async (transaction) => {
    const receipt = await stockReceiptRepository.findByIdForUpdate(id, transaction);
    if (!receipt) throw AppError.notFound("Stock receipt not found");
    if (receipt.status === "COMPLETED") {
      const existing = await stockReceiptRepository.findById(id, transaction);
      return stockReceiptRepository.toPublic(existing);
    }
    if (receipt.status !== "DRAFT") {
      throw AppError.badRequest("Only draft receipts can be completed");
    }
    if (!receipt.items?.length) {
      throw AppError.badRequest("Cannot complete a receipt with no items");
    }

    await assertWarehouse(receipt.warehouseId);

    if (receipt.purchaseOrderId) {
      for (const item of receipt.items) {
        if (!item.purchaseOrderItemId) {
          throw AppError.badRequest(
            "Receipt lines against a purchase order must map to a PO item",
          );
        }
        const poItem = await PurchaseOrderItem.findByPk(item.purchaseOrderItemId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!poItem || poItem.purchaseOrderId !== receipt.purchaseOrderId) {
          throw AppError.badRequest("Invalid purchase order item on receipt");
        }
        const nextReceived = decimal.addQty(poItem.receivedQuantity, item.quantity);
        if (decimal.cmpQty(nextReceived, poItem.quantity) > 0) {
          throw AppError.badRequest("Cannot over-receive a purchase order line");
        }
        poItem.receivedQuantity = nextReceived;
        if (decimal.cmpQty(nextReceived, poItem.quantity) >= 0) {
          poItem.deliveryStatus = "DELIVERED";
          poItem.warehouseId = receipt.warehouseId;
        }
        await poItem.save({ transaction });
      }
    }

    const pairs = receipt.items.map((item) => ({
      productId: item.productId,
      warehouseId: receipt.warehouseId,
    }));
    const locked = await inventoryPosting.lockInventories(pairs, transaction);
    for (const item of receipt.items) {
      await inventoryPosting.postInbound(
        {
          inventory: locked[`${item.productId}|${receipt.warehouseId}`],
          quantity: item.quantity,
          unitCost: item.unitCost,
          type: "PURCHASE",
          createdBy: userId,
          referenceType: "STOCK_RECEIPT",
          referenceId: receipt.id,
          notes: receipt.receiptNumber,
        },
        transaction,
      );
    }

    receipt.status = "COMPLETED";
    await receipt.save({ transaction });
    if (receipt.purchaseOrderId) {
      await refreshPurchaseOrderStatus(receipt.purchaseOrderId, transaction);
    }
    const saved = await stockReceiptRepository.findById(id, transaction);
    return stockReceiptRepository.toPublic(saved);
  });
};

exports.cancel = async (id) => {
  const receipt = await stockReceiptRepository.findById(id);
  if (!receipt) throw AppError.notFound("Stock receipt not found");
  if (receipt.status !== "DRAFT") {
    throw AppError.badRequest("Only draft receipts can be cancelled");
  }
  receipt.status = "CANCELLED";
  await receipt.save();
  const saved = await stockReceiptRepository.findById(id);
  return stockReceiptRepository.toPublic(saved);
};
