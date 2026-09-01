const sequelize = require("../../config/db");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const { nextDocumentNumber } = require("../../shared/helpers/documentNumber.helper");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const models = require("../../database/models");
const stockAdjustmentRepository = require("./stock-adjustment.repository");
const tenant = require("../../shared/helpers/tenant.helper");
const stockBatchService = require("./stock-batch.service");

const { Product, Warehouse, Inventory } = models;

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const assertWarehouse = async (warehouseId, user) => {
  const warehouse = await Warehouse.findByPk(warehouseId);
  if (user) {
    tenant.assertOwned(user, warehouse, "Warehouse not found");
  } else if (!warehouse) {
    throw AppError.badRequest("Warehouse not found");
  }
  if (warehouse.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot adjust an inactive warehouse");
  }
};

const buildLines = async (items, warehouseId, companyId) => {
  const ids = items.map((i) => i.productId);
  if (new Set(ids).size !== ids.length) {
    throw AppError.badRequest("Duplicate products are not allowed on an adjustment");
  }
  const lines = [];
  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    if (!product) throw AppError.badRequest("Product not found");
    if (companyId && product.companyId && product.companyId !== companyId) {
      throw AppError.badRequest("Product not found");
    }
    const inv = await Inventory.findOne({
      where: {
        productId: item.productId,
        warehouseId,
        ...(companyId ? { companyId } : {}),
      },
    });
    const systemQuantity = decimal.qty(inv ? inv.quantity : 0);
    const actualQuantity = decimal.qty(item.actualQuantity);
    lines.push({
      productId: item.productId,
      systemQuantity,
      actualQuantity,
      difference: decimal.subQty(actualQuantity, systemQuantity),
      reason: emptyToNull(item.reason) ?? null,
    });
  }
  return lines;
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = stockAdjustmentRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  tenant.applyWarehouse(where, user);
  const { rows, count } = await stockAdjustmentRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("adjustments", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const row = await stockAdjustmentRepository.findById(id);
  tenant.assertOwned(user, row, "Stock adjustment not found");
  return stockAdjustmentRepository.toPublic(row);
};

exports.create = async (payload, user) => {
  tenant.assertWarehouseAccess(user, payload.warehouseId);
  await assertWarehouse(payload.warehouseId, user);
  const lines = await buildLines(
    payload.items,
    payload.warehouseId,
    tenant.companyIdOf(user),
  );
  return sequelize.transaction(async (transaction) => {
    const adjustmentNumber = await nextDocumentNumber(
      "STOCK_ADJUSTMENT",
      transaction,
    );
    const adjustment = await stockAdjustmentRepository.create(
      {
        warehouseId: payload.warehouseId,
        companyId: tenant.companyIdOf(user),
        createdBy: user.id,
        adjustmentNumber,
        reason: payload.reason,
        adjustmentDate: payload.adjustmentDate || new Date(),
        status: "DRAFT",
        notes: emptyToNull(payload.notes) ?? null,
      },
      transaction,
    );
    await stockAdjustmentRepository.replaceItems(adjustment.id, lines, transaction);
    const saved = await stockAdjustmentRepository.findById(
      adjustment.id,
      transaction,
    );
    return stockAdjustmentRepository.toPublic(saved);
  });
};

exports.update = async (id, payload, user) => {
  const row = await stockAdjustmentRepository.findById(id);
  tenant.assertOwned(user, row, "Stock adjustment not found");
  if (row.status !== "DRAFT") {
    throw AppError.badRequest("Only draft adjustments can be updated");
  }
  const warehouseId = payload.warehouseId || row.warehouseId;
  await assertWarehouse(warehouseId, user);
  const lines = payload.items
    ? await buildLines(payload.items, warehouseId, tenant.companyIdOf(user))
    : null;

  return sequelize.transaction(async (transaction) => {
    const locked = await stockAdjustmentRepository.findByIdForUpdate(
      id,
      transaction,
    );
    if (locked.status !== "DRAFT") {
      throw AppError.badRequest("Only draft adjustments can be updated");
    }
    locked.warehouseId = warehouseId;
    if (payload.reason) locked.reason = payload.reason;
    if (payload.adjustmentDate) locked.adjustmentDate = payload.adjustmentDate;
    if (payload.notes !== undefined) locked.notes = emptyToNull(payload.notes);
    await locked.save({ transaction });
    if (lines) await stockAdjustmentRepository.replaceItems(id, lines, transaction);
    const saved = await stockAdjustmentRepository.findById(id, transaction);
    return stockAdjustmentRepository.toPublic(saved);
  });
};

exports.complete = async (id, user) => {
  const userId = user.id;
  return sequelize.transaction(async (transaction) => {
    const adjustment = await stockAdjustmentRepository.findByIdForUpdate(
      id,
      transaction,
    );
    tenant.assertOwned(user, adjustment, "Stock adjustment not found");
    if (adjustment.status === "COMPLETED") {
      const existing = await stockAdjustmentRepository.findById(id, transaction);
      return stockAdjustmentRepository.toPublic(existing);
    }
    if (adjustment.status !== "DRAFT") {
      throw AppError.badRequest("Only draft adjustments can be completed");
    }
    if (!adjustment.items?.length) {
      throw AppError.badRequest("Cannot complete an adjustment with no items");
    }

    const pairs = adjustment.items.map((item) => ({
      productId: item.productId,
      warehouseId: adjustment.warehouseId,
    }));
    const locked = await inventoryPosting.lockInventories(pairs, transaction);

    for (const item of adjustment.items) {
      const inv = locked[`${item.productId}|${adjustment.warehouseId}`];
      await stockBatchService.adjustToActual(
        {
          inventory: inv,
          actualQuantity: item.actualQuantity,
        },
        transaction,
      );
      const result = await inventoryPosting.setOnHandToActual(
        {
          inventory: inv,
          actualQuantity: item.actualQuantity,
          createdBy: userId,
          referenceType: "STOCK_ADJUSTMENT",
          referenceId: adjustment.id,
          notes: adjustment.adjustmentNumber,
        },
        transaction,
      );
      await stockBatchService.refreshAverageCost(inv, transaction);
      item.systemQuantity = decimal.subQty(
        item.actualQuantity,
        result.difference,
      );
      item.difference = result.difference;
      await item.save({ transaction });
    }

    adjustment.status = "COMPLETED";
    await adjustment.save({ transaction });
    const saved = await stockAdjustmentRepository.findById(id, transaction);
    return stockAdjustmentRepository.toPublic(saved);
  });
};

exports.cancel = async (id, user) => {
  const row = await stockAdjustmentRepository.findById(id);
  tenant.assertOwned(user, row, "Stock adjustment not found");
  if (row.status !== "DRAFT") {
    throw AppError.badRequest("Only draft adjustments can be cancelled");
  }
  row.status = "CANCELLED";
  await row.save();
  const saved = await stockAdjustmentRepository.findById(id);
  return stockAdjustmentRepository.toPublic(saved);
};
