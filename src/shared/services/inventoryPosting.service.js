const models = require("../../database/models");
const AppError = require("../errors/AppError");
const decimal = require("../helpers/decimal.helper");

const lockKey = (productId, warehouseId) => `${productId}|${warehouseId}`;

const getLockedInventory = async (productId, warehouseId, transaction) => {
  const { Inventory } = models;
  let row = await Inventory.findOne({
    where: { productId, warehouseId },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  if (row) return row;

  const warehouse = await models.Warehouse.findByPk(warehouseId, { transaction });
  try {
    await Inventory.create(
      {
        productId,
        warehouseId,
        companyId: warehouse?.companyId || null,
        quantity: 0,
        reservedQuantity: 0,
        averageCost: 0,
      },
      { transaction },
    );
  } catch (err) {
    if (err.name !== "SequelizeUniqueConstraintError") throw err;
  }

  row = await Inventory.findOne({
    where: { productId, warehouseId },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  if (!row) throw AppError.badRequest("Unable to lock inventory row");
  return row;
};

const lockInventories = async (pairs, transaction) => {
  const unique = [
    ...new Map(
      pairs.map((p) => [lockKey(p.productId, p.warehouseId), p]),
    ).values(),
  ].sort((a, b) => lockKey(a.productId, a.warehouseId).localeCompare(
    lockKey(b.productId, b.warehouseId),
  ));

  const locked = {};
  for (const pair of unique) {
    locked[lockKey(pair.productId, pair.warehouseId)] = await getLockedInventory(
      pair.productId,
      pair.warehouseId,
      transaction,
    );
  }
  return locked;
};

const insertLedger = async (
  {
    productId,
    warehouseId,
    createdBy,
    type,
    quantity,
    quantityBefore,
    quantityAfter,
    unitCost,
    referenceType,
    referenceId,
    notes,
  },
  transaction,
  companyId,
) => {
  await models.StockTransaction.create(
    {
      productId,
      warehouseId,
      companyId: companyId || null,
      createdBy,
      type,
      quantity: decimal.qty(quantity),
      quantityBefore: decimal.qty(quantityBefore),
      quantityAfter: decimal.qty(quantityAfter),
      unitCost: unitCost == null ? null : decimal.money(unitCost),
      referenceType,
      referenceId,
      notes: notes || null,
    },
    { transaction },
  );
};

exports.lockInventories = lockInventories;

exports.postInbound = async (
  {
    inventory,
    quantity,
    unitCost,
    type,
    createdBy,
    referenceType,
    referenceId,
    notes,
  },
  transaction,
) => {
  const before = decimal.qty(inventory.quantity);
  const inbound = decimal.qty(quantity);
  const after = decimal.addQty(before, inbound);
  const newAvg = decimal.weightedAverage(
    before,
    inventory.averageCost,
    inbound,
    unitCost,
  );

  await insertLedger(
    {
      productId: inventory.productId,
      warehouseId: inventory.warehouseId,
      createdBy,
      type,
      quantity: inbound,
      quantityBefore: before,
      quantityAfter: after,
      unitCost,
      referenceType,
      referenceId,
      notes,
    },
    transaction,
    inventory.companyId,
  );

  inventory.quantity = after;
  inventory.averageCost = newAvg;
  await inventory.save({ transaction });
  return inventory;
};

exports.postOutbound = async (
  {
    inventory,
    quantity,
    type,
    createdBy,
    referenceType,
    referenceId,
    notes,
    unitCost: unitCostOverride,
  },
  transaction,
) => {
  const before = decimal.qty(inventory.quantity);
  const reserved = decimal.qty(inventory.reservedQuantity);
  const avail = decimal.available(before, reserved);
  const outbound = decimal.qty(quantity);

  if (decimal.cmpQty(avail, outbound) < 0) {
    throw AppError.badRequest(
      "Insufficient available stock for this product at the selected warehouse",
    );
  }

  const after = decimal.subQty(before, outbound);
  const unitCost =
    unitCostOverride != null
      ? decimal.money(unitCostOverride)
      : decimal.money(inventory.averageCost);

  await insertLedger(
    {
      productId: inventory.productId,
      warehouseId: inventory.warehouseId,
      createdBy,
      type,
      quantity: outbound,
      quantityBefore: before,
      quantityAfter: after,
      unitCost,
      referenceType,
      referenceId,
      notes,
    },
    transaction,
    inventory.companyId,
  );

  inventory.quantity = after;
  await inventory.save({ transaction });
  return { inventory, unitCost };
};

exports.setOnHandToActual = async (
  {
    inventory,
    actualQuantity,
    createdBy,
    referenceType,
    referenceId,
    notes,
  },
  transaction,
) => {
  const before = decimal.qty(inventory.quantity);
  const actual = decimal.qty(actualQuantity);
  const difference = decimal.subQty(actual, before);
  const unitCost = decimal.money(inventory.averageCost);

  if (decimal.isZeroQty(difference)) {
    return { inventory, difference, unitCost, posted: false };
  }

  const isIn = decimal.cmpQty(difference, 0) > 0;
  const quantity = isIn ? difference : decimal.subQty(0, difference);

  await insertLedger(
    {
      productId: inventory.productId,
      warehouseId: inventory.warehouseId,
      createdBy,
      type: isIn ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
      quantity,
      quantityBefore: before,
      quantityAfter: actual,
      unitCost,
      referenceType,
      referenceId,
      notes,
    },
    transaction,
    inventory.companyId,
  );

  inventory.quantity = actual;
  inventory.lastCountedAt = new Date();
  await inventory.save({ transaction });
  return { inventory, difference, unitCost, posted: true };
};
