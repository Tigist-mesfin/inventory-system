const { Op } = require("sequelize");
const models = require("../../database/models");

const { StockTransaction, Product, Warehouse, User } = models;

const include = [
  {
    model: Product,
    as: "product",
    attributes: ["id", "sku", "name", "brand", "size", "color", "unit"],
  },
  { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
  {
    model: User,
    as: "creator",
    attributes: ["id", "fullName", "username"],
  },
];

const toPublic = (row) => {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    productId: plain.productId,
    warehouseId: plain.warehouseId,
    createdBy: plain.createdBy,
    type: plain.type,
    quantity: plain.quantity,
    quantityBefore: plain.quantityBefore,
    quantityAfter: plain.quantityAfter,
    unitCost: plain.unitCost,
    referenceType: plain.referenceType,
    referenceId: plain.referenceId,
    notes: plain.notes,
    product: plain.product || null,
    warehouse: plain.warehouse || null,
    creator: plain.creator || null,
    createdAt: plain.createdAt,
  };
};

exports.toPublic = toPublic;

exports.searchWhere = ({
  productId,
  warehouseId,
  type,
  referenceType,
  referenceId,
  from,
  to,
}) => {
  const where = {};
  if (productId) where.productId = productId;
  if (warehouseId) where.warehouseId = warehouseId;
  if (type) where.type = type;
  if (referenceType) where.referenceType = referenceType;
  if (referenceId) where.referenceId = referenceId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = from;
    if (to) where.createdAt[Op.lte] = to;
  }
  return where;
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await StockTransaction.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true,
  });
  return { rows: rows.map(toPublic), count };
};
