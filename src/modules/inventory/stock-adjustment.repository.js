const { Op } = require("sequelize");
const models = require("../../database/models");

const { StockAdjustment, StockAdjustmentItem, Product, Warehouse, User } = models;

const include = [
  {
    model: StockAdjustmentItem,
    as: "items",
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["id", "sku", "name", "brand", "size", "color", "unit"],
      },
    ],
  },
  { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
  { model: User, as: "creator", attributes: ["id", "fullName", "username"] },
];

const toPublic = (row) => {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    warehouseId: plain.warehouseId,
    createdBy: plain.createdBy,
    adjustmentNumber: plain.adjustmentNumber,
    reason: plain.reason,
    adjustmentDate: plain.adjustmentDate,
    status: plain.status,
    notes: plain.notes,
    warehouse: plain.warehouse || null,
    creator: plain.creator || null,
    items: (plain.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      systemQuantity: item.systemQuantity,
      actualQuantity: item.actualQuantity,
      difference: item.difference,
      reason: item.reason,
      product: item.product || null,
    })),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.toPublic = toPublic;

exports.searchWhere = (query) => {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.search) where.adjustmentNumber = { [Op.like]: `%${query.search}%` };
  return where;
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await StockAdjustment.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [["adjustmentDate", "DESC"]],
    distinct: true,
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id, transaction) =>
  StockAdjustment.findByPk(id, { include, transaction });

exports.findByIdForUpdate = async (id, transaction) =>
  StockAdjustment.findByPk(id, {
    include: [{ model: StockAdjustmentItem, as: "items" }],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

exports.create = async (payload, transaction) => {
  const created = await StockAdjustment.create(payload, { transaction });
  return StockAdjustment.findByPk(created.id, { include, transaction });
};

exports.replaceItems = async (stockAdjustmentId, items, transaction) => {
  await StockAdjustmentItem.destroy({ where: { stockAdjustmentId }, transaction });
  await StockAdjustmentItem.bulkCreate(
    items.map((item) => ({ ...item, stockAdjustmentId })),
    { transaction },
  );
};
