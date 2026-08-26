const sequelize = require("../../config/db");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const { nextDocumentNumber } = require("../../shared/helpers/documentNumber.helper");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const models = require("../../database/models");
const stockTransferRepository = require("./stock-transfer.repository");
const tenant = require("../../shared/helpers/tenant.helper");

const { Product, Warehouse } = models;

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const assertWarehouses = async (sourceId, destId) => {
  if (sourceId === destId) {
    throw AppError.badRequest("Source and destination warehouses must differ");
  }
  const [source, dest] = await Promise.all([
    Warehouse.findByPk(sourceId),
    Warehouse.findByPk(destId),
  ]);
  if (!source || !dest) throw AppError.badRequest("Warehouse not found");
  if (source.status !== "ACTIVE" || dest.status !== "ACTIVE") {
    throw AppError.badRequest("Both warehouses must be active");
  }
};

const buildLines = async (items) => {
  const ids = items.map((i) => i.productId);
  if (new Set(ids).size !== ids.length) {
    throw AppError.badRequest("Duplicate products are not allowed on a transfer");
  }
  const lines = [];
  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    if (!product) throw AppError.badRequest("Product not found");
    lines.push({
      productId: item.productId,
      quantity: decimal.qty(item.quantity),
    });
  }
  return lines;
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = stockTransferRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  tenant.applyTransferWarehouses(where, user);
  const { rows, count } = await stockTransferRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("transfers", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const row = await stockTransferRepository.findById(id);
  tenant.assertOwned(user, row, "Stock transfer not found");
  return stockTransferRepository.toPublic(row);
};

exports.create = async (payload, user) => {
  tenant.assertWarehouseAccess(user, payload.sourceWarehouseId);
  tenant.assertWarehouseAccess(user, payload.destinationWarehouseId);
  await assertWarehouses(payload.sourceWarehouseId, payload.destinationWarehouseId);
  const lines = await buildLines(payload.items);
  return sequelize.transaction(async (transaction) => {
    const transferNumber = await nextDocumentNumber("STOCK_TRANSFER", transaction);
    const transfer = await stockTransferRepository.create(
      {
        sourceWarehouseId: payload.sourceWarehouseId,
        destinationWarehouseId: payload.destinationWarehouseId,
        companyId: tenant.companyIdOf(user),
        createdBy: user.id,
        transferNumber,
        transferDate: payload.transferDate || new Date(),
        status: "DRAFT",
        notes: emptyToNull(payload.notes) ?? null,
      },
      transaction,
    );
    await stockTransferRepository.replaceItems(transfer.id, lines, transaction);
    const saved = await stockTransferRepository.findById(transfer.id, transaction);
    return stockTransferRepository.toPublic(saved);
  });
};

exports.update = async (id, payload) => {
  const transfer = await stockTransferRepository.findById(id);
  if (!transfer) throw AppError.notFound("Stock transfer not found");
  if (transfer.status !== "DRAFT") {
    throw AppError.badRequest("Only draft transfers can be updated");
  }
  const sourceId = payload.sourceWarehouseId || transfer.sourceWarehouseId;
  const destId = payload.destinationWarehouseId || transfer.destinationWarehouseId;
  await assertWarehouses(sourceId, destId);
  const lines = payload.items ? await buildLines(payload.items) : null;

  return sequelize.transaction(async (transaction) => {
    const locked = await stockTransferRepository.findByIdForUpdate(id, transaction);
    if (locked.status !== "DRAFT") {
      throw AppError.badRequest("Only draft transfers can be updated");
    }
    locked.sourceWarehouseId = sourceId;
    locked.destinationWarehouseId = destId;
    if (payload.transferDate) locked.transferDate = payload.transferDate;
    if (payload.notes !== undefined) locked.notes = emptyToNull(payload.notes);
    await locked.save({ transaction });
    if (lines) await stockTransferRepository.replaceItems(id, lines, transaction);
    const saved = await stockTransferRepository.findById(id, transaction);
    return stockTransferRepository.toPublic(saved);
  });
};

exports.complete = async (id, userId) => {
  return sequelize.transaction(async (transaction) => {
    const transfer = await stockTransferRepository.findByIdForUpdate(id, transaction);
    if (!transfer) throw AppError.notFound("Stock transfer not found");
    if (transfer.status === "COMPLETED") {
      const existing = await stockTransferRepository.findById(id, transaction);
      return stockTransferRepository.toPublic(existing);
    }
    if (transfer.status !== "DRAFT") {
      throw AppError.badRequest("Only draft transfers can be completed");
    }
    if (!transfer.items?.length) {
      throw AppError.badRequest("Cannot complete a transfer with no items");
    }
    await assertWarehouses(
      transfer.sourceWarehouseId,
      transfer.destinationWarehouseId,
    );

    const pairs = [];
    for (const item of transfer.items) {
      pairs.push({
        productId: item.productId,
        warehouseId: transfer.sourceWarehouseId,
      });
      pairs.push({
        productId: item.productId,
        warehouseId: transfer.destinationWarehouseId,
      });
    }
    const locked = await inventoryPosting.lockInventories(pairs, transaction);

    for (const item of transfer.items) {
      const sourceInv =
        locked[`${item.productId}|${transfer.sourceWarehouseId}`];
      const destInv =
        locked[`${item.productId}|${transfer.destinationWarehouseId}`];
      const out = await inventoryPosting.postOutbound(
        {
          inventory: sourceInv,
          quantity: item.quantity,
          type: "TRANSFER_OUT",
          createdBy: userId,
          referenceType: "STOCK_TRANSFER",
          referenceId: transfer.id,
          notes: transfer.transferNumber,
        },
        transaction,
      );
      await inventoryPosting.postInbound(
        {
          inventory: destInv,
          quantity: item.quantity,
          unitCost: out.unitCost,
          type: "TRANSFER_IN",
          createdBy: userId,
          referenceType: "STOCK_TRANSFER",
          referenceId: transfer.id,
          notes: transfer.transferNumber,
        },
        transaction,
      );
      item.receivedQuantity = item.quantity;
      await item.save({ transaction });
    }

    transfer.status = "COMPLETED";
    await transfer.save({ transaction });
    const saved = await stockTransferRepository.findById(id, transaction);
    return stockTransferRepository.toPublic(saved);
  });
};

exports.cancel = async (id) => {
  const transfer = await stockTransferRepository.findById(id);
  if (!transfer) throw AppError.notFound("Stock transfer not found");
  if (transfer.status !== "DRAFT") {
    throw AppError.badRequest("Only draft transfers can be cancelled");
  }
  transfer.status = "CANCELLED";
  await transfer.save();
  const saved = await stockTransferRepository.findById(id);
  return stockTransferRepository.toPublic(saved);
};
