const { Op } = require("sequelize");
const models = require("../../database/models");
const AppError = require("../../shared/errors/AppError");
const decimal = require("../../shared/helpers/decimal.helper");

const {
  StockBatch,
  SaleCostAllocation,
  PurchaseOrder,
  PurchaseOrderItem,
  Supplier,
  Warehouse,
} = models;

const companyMatch = (companyId) =>
  companyId ? { companyId } : { companyId: "00000000-0000-0000-0000-000000000000" };

const fifoSort = (a, b) => {
  const da = new Date(a.purchaseDate).getTime();
  const db = new Date(b.purchaseDate).getTime();
  if (da !== db) return da - db;
  return String(a.createdAt || a.id).localeCompare(String(b.createdAt || b.id));
};

const lockBatches = async (productId, warehouseId, transaction) => {
  const rows = await StockBatch.findAll({
    where: { productId, warehouseId },
    lock: transaction.LOCK.UPDATE,
    transaction,
    order: [["id", "ASC"]],
  });
  return rows;
};

const remainingSum = (rows) =>
  rows.reduce(
    (sum, row) => decimal.addQty(sum, row.remainingQuantity || 0),
    decimal.qty(0),
  );

const onHandOf = (inventory) =>
  decimal.available(
    inventory?.quantity ?? inventory?.dataValues?.quantity ?? 0,
    inventory?.reservedQuantity ?? inventory?.dataValues?.reservedQuantity ?? 0,
  );

const refreshAverageCost = async (inventory, transaction) => {
  const rows = await StockBatch.findAll({
    where: {
      productId: inventory.productId,
      warehouseId: inventory.warehouseId,
      remainingQuantity: { [Op.gt]: 0 },
    },
    transaction,
  });
  let qty = decimal.qty(0);
  let value = decimal.money(0);
  for (const row of rows) {
    const q = decimal.qty(row.remainingQuantity);
    if (decimal.cmpQty(q, 0) <= 0) continue;
    qty = decimal.addQty(qty, q);
    value = decimal.addMoney(value, decimal.lineTotal(q, row.unitCost, 0));
  }
  if (decimal.cmpQty(qty, 0) <= 0) return inventory;
  const avg = decimal.money(Number(value) / Number(qty));
  inventory.averageCost = avg;
  await inventory.save({ transaction });
  return inventory;
};

const createBatch = async (payload, transaction) => {
  const quantity = decimal.qty(payload.quantity);
  if (decimal.cmpQty(quantity, 0) <= 0) return null;
  return StockBatch.create(
    {
      companyId: payload.companyId || null,
      productId: payload.productId,
      warehouseId: payload.warehouseId,
      purchaseOrderId: payload.purchaseOrderId || null,
      purchaseOrderItemId: payload.purchaseOrderItemId || null,
      sourceBatchId: payload.sourceBatchId || null,
      sourceType: payload.sourceType || "PURCHASE",
      purchaseDate: payload.purchaseDate || new Date(),
      unitCost: decimal.money(payload.unitCost || 0),
      originalQuantity: quantity,
      remainingQuantity: quantity,
    },
    { transaction },
  );
};

const fillLotGap = async (inventory, transaction) => {
  const rows = await lockBatches(
    inventory.productId,
    inventory.warehouseId,
    transaction,
  );
  const covered = remainingSum(rows);
  const onHand = onHandOf(inventory);
  if (decimal.cmpQty(onHand, covered) <= 0) return rows;
  await createBatch(
    {
      companyId: inventory.companyId,
      productId: inventory.productId,
      warehouseId: inventory.warehouseId,
      sourceType: "OPENING",
      purchaseDate: inventory.createdAt || new Date(),
      unitCost: inventory.averageCost || 0,
      quantity: decimal.subQty(onHand, covered),
    },
    transaction,
  );
  return lockBatches(inventory.productId, inventory.warehouseId, transaction);
};

const ensureCoverage = async (inventory, transaction) => {
  await fillLotGap(inventory, transaction);
};

const trimRemainingToOnHand = async (inventory, transaction) => {
  const rows = await lockBatches(
    inventory.productId,
    inventory.warehouseId,
    transaction,
  );
  let excess = decimal.subQty(remainingSum(rows), decimal.qty(inventory.quantity));
  if (decimal.cmpQty(excess, 0) <= 0) return rows;
  const ordered = [...rows].sort((a, b) => {
    if (a.sourceType === "OPENING" && b.sourceType !== "OPENING") return -1;
    if (b.sourceType === "OPENING" && a.sourceType !== "OPENING") return 1;
    return new Date(b.purchaseDate) - new Date(a.purchaseDate);
  });
  for (const row of ordered) {
    if (decimal.cmpQty(excess, 0) <= 0) break;
    const remaining = decimal.qty(row.remainingQuantity);
    if (decimal.cmpQty(remaining, 0) <= 0) continue;
    const take =
      decimal.cmpQty(remaining, excess) <= 0 ? remaining : excess;
    row.remainingQuantity = decimal.subQty(remaining, take);
    await row.save({ transaction });
    excess = decimal.subQty(excess, take);
  }
  return lockBatches(inventory.productId, inventory.warehouseId, transaction);
};

const backfillStoreLots = async (inventory, transaction) => {
  if (!inventory) return;
  const delivered = await PurchaseOrderItem.findAll({
    where: {
      productId: inventory.productId,
      warehouseId: inventory.warehouseId,
      deliveryStatus: "DELIVERED",
    },
    include: [
      {
        model: PurchaseOrder,
        as: "purchaseOrder",
        required: false,
        attributes: ["id", "orderDate", "companyId"],
      },
    ],
    transaction,
  });
  const existing = await lockBatches(
    inventory.productId,
    inventory.warehouseId,
    transaction,
  );
  const linked = new Set(
    existing.map((row) => row.purchaseOrderItemId).filter(Boolean),
  );
  for (const item of delivered) {
    if (linked.has(item.id)) continue;
    const quantity = decimal.qty(item.receivedQuantity || item.quantity || 0);
    if (decimal.cmpQty(quantity, 0) <= 0) continue;
    await createBatch(
      {
        companyId: inventory.companyId || item.purchaseOrder?.companyId,
        productId: inventory.productId,
        warehouseId: inventory.warehouseId,
        purchaseOrderId: item.purchaseOrderId,
        purchaseOrderItemId: item.id,
        sourceType: "PURCHASE",
        purchaseDate: item.purchaseOrder?.orderDate || new Date(),
        unitCost: item.unitPrice,
        quantity,
      },
      transaction,
    );
  }
  await trimRemainingToOnHand(inventory, transaction);
  await ensureCoverage(inventory, transaction);
};

const takeFromRows = (rows, quantity) => {
  let need = decimal.qty(quantity);
  const picks = [];
  const ordered = [...rows]
    .filter((row) => decimal.cmpQty(row.remainingQuantity || 0, 0) > 0)
    .sort(fifoSort);

  for (const row of ordered) {
    if (decimal.cmpQty(need, 0) <= 0) break;
    const available = decimal.qty(row.remainingQuantity);
    const take = decimal.cmpQty(available, need) <= 0 ? available : need;
    if (decimal.cmpQty(take, 0) <= 0) continue;
    picks.push({
      batch: row,
      quantity: take,
      unitCost: decimal.money(row.unitCost),
    });
    need = decimal.subQty(need, take);
  }
  if (decimal.cmpQty(need, 0) > 0) {
    throw AppError.badRequest(
      `This store only has ${decimal.subQty(quantity, need)} of this item`,
    );
  }
  return picks;
};

const assertEnoughOnHand = (inventory, quantity) => {
  const need = decimal.qty(quantity);
  const onHand = onHandOf(inventory);
  if (decimal.cmpQty(onHand, need) < 0) {
    throw AppError.badRequest(
      `This store only has ${onHand} of this item`,
    );
  }
  return { need, onHand };
};

const applyPicks = async (picks, transaction) => {
  for (const pick of picks) {
    pick.batch.remainingQuantity = decimal.subQty(
      pick.batch.remainingQuantity,
      pick.quantity,
    );
    if (decimal.cmpQty(pick.batch.remainingQuantity, 0) < 0) {
      throw AppError.badRequest(
        "Purchase lot remaining quantity cannot go negative",
      );
    }
    await pick.batch.save({ transaction });
  }
};

const consumeFifo = async ({ inventory, quantity }, transaction) => {
  if (inventory.reload) {
    await inventory.reload({ transaction, lock: transaction.LOCK.UPDATE });
  }
  assertEnoughOnHand(inventory, quantity);
  await backfillStoreLots(inventory, transaction);
  const rows = await fillLotGap(inventory, transaction);
  const picks = takeFromRows(rows, quantity);
  await applyPicks(picks, transaction);
  return picks;
};

const consumeManual = async (
  { inventory, quantity, allocations },
  transaction,
) => {
  if (inventory.reload) {
    await inventory.reload({ transaction, lock: transaction.LOCK.UPDATE });
  }
  assertEnoughOnHand(inventory, quantity);
  await backfillStoreLots(inventory, transaction);
  const rows = await fillLotGap(inventory, transaction);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const wanted = decimal.qty(quantity);
  let total = decimal.qty(0);
  const picks = [];

  for (const alloc of allocations || []) {
    const take = decimal.qty(alloc.quantity);
    if (decimal.cmpQty(take, 0) <= 0) {
      throw AppError.badRequest(
        "Each selected purchase lot needs a quantity greater than zero",
      );
    }
    const batch = byId.get(alloc.stockBatchId);
    if (!batch) {
      throw AppError.badRequest("Selected purchase lot is not in this store");
    }
    if (decimal.cmpQty(batch.remainingQuantity, take) < 0) {
      throw AppError.badRequest(
        "Cannot sell more than the remaining quantity of the selected purchase lot",
      );
    }
    picks.push({
      batch,
      quantity: take,
      unitCost: decimal.money(batch.unitCost),
    });
    total = decimal.addQty(total, take);
  }

  if (decimal.cmpQty(total, wanted) !== 0) {
    throw AppError.badRequest(
      "Selected purchase lots must add up to the quantity being sold",
    );
  }
  await applyPicks(picks, transaction);
  return picks;
};

const consumeForSale = async (
  { inventory, quantity, costingMethod, allocations },
  transaction,
) => {
  const method = String(costingMethod || "SIMPLE").toUpperCase();
  if (method === "MANUAL") {
    return consumeManual({ inventory, quantity, allocations }, transaction);
  }
  return consumeFifo({ inventory, quantity }, transaction);
};

const weightedUnitCost = (picks) => {
  let qty = decimal.qty(0);
  let cost = decimal.money(0);
  for (const pick of picks) {
    cost = decimal.weightedAverage(qty, cost, pick.quantity, pick.unitCost);
    qty = decimal.addQty(qty, pick.quantity);
  }
  return cost;
};

const recordSaleAllocations = async (
  { saleId, saleItemId, companyId, costingMethod, picks },
  transaction,
) => {
  const method = String(costingMethod || "SIMPLE").toUpperCase();
  const rows = picks.map((pick) => ({
    companyId: companyId || null,
    saleId,
    saleItemId,
    stockBatchId: pick.batch.id,
    quantity: pick.quantity,
    unitCost: pick.unitCost,
    totalCost: decimal.lineTotal(pick.quantity, pick.unitCost, 0),
    costingMethod:
      method === "MANUAL" ? "MANUAL" : method === "FIFO" ? "FIFO" : "SIMPLE",
  }));
  if (rows.length) {
    await SaleCostAllocation.bulkCreate(rows, { transaction });
  }
  return rows;
};

const restoreSaleAllocations = async ({ saleId }, transaction) => {
  const rows = await SaleCostAllocation.findAll({
    where: { saleId },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  for (const row of rows) {
    const batch = await StockBatch.findByPk(row.stockBatchId, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!batch) continue;
    batch.remainingQuantity = decimal.addQty(
      batch.remainingQuantity,
      row.quantity,
    );
    await batch.save({ transaction });
  }
  await SaleCostAllocation.destroy({ where: { saleId }, transaction });
};

const releasePurchaseBatches = async (
  { purchaseOrderItemId, warehouseId, quantity },
  transaction,
) => {
  const need = decimal.qty(quantity);
  if (decimal.cmpQty(need, 0) <= 0) return;
  const rows = await StockBatch.findAll({
    where: { purchaseOrderItemId, warehouseId },
    lock: transaction.LOCK.UPDATE,
    transaction,
    order: [["createdAt", "ASC"]],
  });
  let left = need;
  for (const row of rows) {
    if (decimal.cmpQty(left, 0) <= 0) break;
    const available = decimal.qty(row.remainingQuantity);
    const take = decimal.cmpQty(available, left) <= 0 ? available : left;
    row.remainingQuantity = decimal.subQty(row.remainingQuantity, take);
    await row.save({ transaction });
    left = decimal.subQty(left, take);
  }
  if (decimal.cmpQty(left, 0) > 0) {
    throw AppError.badRequest(
      "Cannot reverse this delivery because some of the stock from this purchase was already sold or transferred",
    );
  }
};

const transferFifo = async (
  { sourceInventory, destInventory, quantity },
  transaction,
) => {
  await ensureCoverage(destInventory, transaction);
  const picks = await consumeFifo(
    { inventory: sourceInventory, quantity },
    transaction,
  );
  const created = [];
  for (const pick of picks) {
    const dest = await createBatch(
      {
        companyId: destInventory.companyId || sourceInventory.companyId,
        productId: destInventory.productId,
        warehouseId: destInventory.warehouseId,
        purchaseOrderId: pick.batch.purchaseOrderId,
        purchaseOrderItemId: pick.batch.purchaseOrderItemId,
        sourceBatchId: pick.batch.id,
        sourceType: "TRANSFER",
        purchaseDate: pick.batch.purchaseDate,
        unitCost: pick.unitCost,
        quantity: pick.quantity,
      },
      transaction,
    );
    created.push(dest);
  }
  await refreshAverageCost(sourceInventory, transaction);
  return { picks, created, unitCost: weightedUnitCost(picks) };
};

const adjustToActual = async ({ inventory, actualQuantity }, transaction) => {
  await ensureCoverage(inventory, transaction);
  const current = decimal.qty(inventory.quantity);
  const actual = decimal.qty(actualQuantity);
  const diff = decimal.subQty(actual, current);
  if (decimal.isZeroQty(diff)) return { picks: [], created: null };
  if (decimal.cmpQty(diff, 0) > 0) {
    const created = await createBatch(
      {
        companyId: inventory.companyId,
        productId: inventory.productId,
        warehouseId: inventory.warehouseId,
        sourceType: "ADJUSTMENT",
        purchaseDate: new Date(),
        unitCost: inventory.averageCost || 0,
        quantity: diff,
      },
      transaction,
    );
    return { picks: [], created };
  }
  const picks = await consumeFifo(
    { inventory, quantity: decimal.subQty(0, diff) },
    transaction,
  );
  return { picks, created: null };
};

const toPublicBatch = (row, extras = {}) => {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  const original = decimal.qty(plain.originalQuantity);
  const remaining = decimal.qty(plain.remainingQuantity);
  const soldQuantity =
    extras.soldQuantity != null
      ? decimal.qty(extras.soldQuantity)
      : decimal.subQty(original, remaining);
  return {
    id: plain.id,
    productId: plain.productId,
    warehouseId: plain.warehouseId,
    purchaseOrderId: plain.purchaseOrderId,
    purchaseOrderItemId: plain.purchaseOrderItemId,
    sourceBatchId: plain.sourceBatchId,
    sourceType: plain.sourceType,
    purchaseDate: plain.purchaseDate,
    unitCost: plain.unitCost,
    originalQuantity: original,
    remainingQuantity: remaining,
    soldQuantity,
    purchaseOrder: plain.purchaseOrder
      ? {
          id: plain.purchaseOrder.id,
          orderNumber: plain.purchaseOrder.orderNumber,
          orderDate: plain.purchaseOrder.orderDate,
          supplier: plain.purchaseOrder.supplier || null,
        }
      : null,
    warehouse: plain.warehouse || null,
    createdAt: plain.createdAt,
  };
};

const publicInclude = [
  {
    model: PurchaseOrder,
    as: "purchaseOrder",
    attributes: ["id", "orderNumber", "orderDate"],
    required: false,
    include: [
      {
        model: Supplier,
        as: "supplier",
        attributes: ["id", "name"],
        required: false,
      },
    ],
  },
  { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
];

const listPurchases = async ({ productId, warehouseId, companyId }) => {
  const poWhere = {
    status: { [Op.ne]: "CANCELLED" },
    ...companyMatch(companyId),
  };
  const rows = await PurchaseOrderItem.findAll({
    where: { productId },
    include: [
      {
        model: PurchaseOrder,
        as: "purchaseOrder",
        required: true,
        where: poWhere,
        attributes: ["id", "orderNumber", "orderDate", "companyId"],
        include: [
          {
            model: Supplier,
            as: "supplier",
            attributes: ["id", "name"],
            required: false,
          },
        ],
      },
      {
        model: Warehouse,
        as: "warehouse",
        attributes: ["id", "name", "code"],
        required: false,
      },
      { model: StockBatch, as: "stockBatches", required: false },
    ],
    order: [
      [{ model: PurchaseOrder, as: "purchaseOrder" }, "orderDate", "DESC"],
    ],
  });
  return rows.map((row) => {
    const plain = row.toJSON();
    const storeBatches = (plain.stockBatches || []).filter(
      (batch) => !warehouseId || batch.warehouseId === warehouseId,
    );
    const remainingQuantity = storeBatches.reduce(
      (sum, batch) => decimal.addQty(sum, batch.remainingQuantity || 0),
      decimal.qty(0),
    );
    return {
      id: plain.id,
      purchaseOrderId: plain.purchaseOrderId,
      document: plain.purchaseOrder?.orderNumber || "",
      purchaseDate: plain.purchaseOrder?.orderDate || null,
      supplier: plain.purchaseOrder?.supplier?.name || "Walk-in",
      unitCost: plain.unitPrice,
      quantity: plain.quantity,
      remainingQuantity,
      deliveryStatus: plain.deliveryStatus,
      warehouseName: plain.warehouse?.name || null,
      inThisStore: Boolean(warehouseId && plain.warehouseId === warehouseId),
    };
  });
};

const listAvailable = async ({ productId, warehouseId, companyId }) => {
  const where = {
    productId,
    warehouseId,
    remainingQuantity: { [Op.gt]: 0 },
  };
  if (companyId) {
    where[Op.or] = [{ companyId }, { companyId: null }];
  } else {
    Object.assign(where, companyMatch(companyId));
  }
  const rows = await StockBatch.findAll({
    where,
    include: publicInclude,
    order: [
      ["purchaseDate", "ASC"],
      ["createdAt", "ASC"],
    ],
  });
  const soldMap = {};
  if (rows.length) {
    const allocs = await SaleCostAllocation.findAll({
      where: { stockBatchId: { [Op.in]: rows.map((r) => r.id) } },
      attributes: ["stockBatchId", "quantity"],
    });
    for (const alloc of allocs) {
      soldMap[alloc.stockBatchId] = decimal.addQty(
        soldMap[alloc.stockBatchId] || 0,
        alloc.quantity,
      );
    }
  }
  return rows
    .sort(fifoSort)
    .map((row) => toPublicBatch(row, { soldQuantity: soldMap[row.id] || 0 }));
};

const previewFifo = (batches, quantity) => {
  let need = decimal.qty(quantity);
  const lines = [];
  for (const batch of batches) {
    if (decimal.cmpQty(need, 0) <= 0) break;
    const available = decimal.qty(batch.remainingQuantity);
    const take = decimal.cmpQty(available, need) <= 0 ? available : need;
    if (decimal.cmpQty(take, 0) <= 0) continue;
    lines.push({
      stockBatchId: batch.id,
      purchaseDate: batch.purchaseDate,
      unitCost: batch.unitCost,
      quantity: take,
      remainingQuantity: available,
      originalQuantity: batch.originalQuantity,
      totalCost: decimal.lineTotal(take, batch.unitCost, 0),
      purchaseOrder: batch.purchaseOrder || null,
    });
    need = decimal.subQty(need, take);
  }
  const totalCost = lines.reduce(
    (sum, line) => decimal.addMoney(sum, line.totalCost),
    decimal.money(0),
  );
  return {
    quantity: decimal.qty(quantity),
    shortfall: decimal.cmpQty(need, 0) > 0 ? need : decimal.qty(0),
    totalCost,
    lines,
  };
};

module.exports = {
  createBatch,
  createPurchaseBatch: (payload, transaction) =>
    createBatch({ ...payload, sourceType: "PURCHASE" }, transaction),
  consumeFifo,
  consumeManual,
  consumeForSale,
  weightedUnitCost,
  recordSaleAllocations,
  restoreSaleAllocations,
  releasePurchaseBatches,
  transferFifo,
  adjustToActual,
  refreshAverageCost,
  ensureCoverage,
  backfillStoreLots,
  listPurchases,
  listAvailable,
  previewFifo,
  toPublicBatch,
  publicInclude,
};
