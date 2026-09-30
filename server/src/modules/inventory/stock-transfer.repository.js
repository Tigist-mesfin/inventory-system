const { Op } = require("sequelize");
const models = require("../../database/models");

const { StockTransfer, StockTransferItem, Product, Warehouse, User } = models;

const include = [
  {
    model: StockTransferItem,
    as: "items",
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["id", "sku", "name", "brand", "size", "color", "unit"],
      },
    ],
  },
  { model: Warehouse, as: "sourceWarehouse", attributes: ["id", "name", "code"] },
  { model: Warehouse, as: "destinationWarehouse", attributes: ["id", "name", "code"] },
  { model: User, as: "creator", attributes: ["id", "fullName", "username"] },
];

const toPublic = (row) => {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    sourceWarehouseId: plain.sourceWarehouseId,
    destinationWarehouseId: plain.destinationWarehouseId,
    createdBy: plain.createdBy,
    transferNumber: plain.transferNumber,
    transferDate: plain.transferDate,
    status: plain.status,
    notes: plain.notes,
    sourceWarehouse: plain.sourceWarehouse || null,
    destinationWarehouse: plain.destinationWarehouse || null,
    creator: plain.creator || null,
    items: (plain.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      receivedQuantity: item.receivedQuantity,
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
  if (query.sourceWarehouseId) where.sourceWarehouseId = query.sourceWarehouseId;
  if (query.destinationWarehouseId) {
    where.destinationWarehouseId = query.destinationWarehouseId;
  }
  if (query.search) where.transferNumber = { [Op.like]: `%${query.search}%` };
  return where;
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await StockTransfer.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [["transferDate", "DESC"]],
    distinct: true,
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id, transaction) =>
  StockTransfer.findByPk(id, { include, transaction });

exports.findByIdForUpdate = async (id, transaction) =>
  StockTransfer.findByPk(id, {
    include: [{ model: StockTransferItem, as: "items" }],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

exports.create = async (payload, transaction) => {
  const created = await StockTransfer.create(payload, { transaction });
  return StockTransfer.findByPk(created.id, { include, transaction });
};

exports.replaceItems = async (stockTransferId, items, transaction) => {
  await StockTransferItem.destroy({ where: { stockTransferId }, transaction });
  await StockTransferItem.bulkCreate(
    items.map((item) => ({ ...item, stockTransferId, receivedQuantity: 0 })),
    { transaction },
  );
};
