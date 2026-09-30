const { Op } = require("sequelize");
const models = require("../../database/models");

const {
  StockReceipt,
  StockReceiptItem,
  Product,
  Warehouse,
  User,
  PurchaseOrder,
} = models;

const include = [
  {
    model: StockReceiptItem,
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
  { model: User, as: "receiver", attributes: ["id", "fullName", "username"] },
  {
    model: PurchaseOrder,
    as: "purchaseOrder",
    attributes: ["id", "orderNumber", "status", "supplierId"],
    required: false,
  },
];

const toPublic = (row) => {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    purchaseOrderId: plain.purchaseOrderId,
    warehouseId: plain.warehouseId,
    receivedBy: plain.receivedBy,
    receiptNumber: plain.receiptNumber,
    receiptDate: plain.receiptDate,
    status: plain.status,
    notes: plain.notes,
    warehouse: plain.warehouse || null,
    receiver: plain.receiver || null,
    purchaseOrder: plain.purchaseOrder || null,
    items: (plain.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      purchaseOrderItemId: item.purchaseOrderItemId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      product: item.product || null,
    })),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.toPublic = toPublic;

exports.searchWhere = ({ search, status, warehouseId, purchaseOrderId }) => {
  const where = {};
  if (status) where.status = status;
  if (warehouseId) where.warehouseId = warehouseId;
  if (purchaseOrderId) where.purchaseOrderId = purchaseOrderId;
  if (search) where.receiptNumber = { [Op.like]: `%${search}%` };
  return where;
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await StockReceipt.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [["receiptDate", "DESC"]],
    distinct: true,
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id, transaction) =>
  StockReceipt.findByPk(id, { include, transaction });

exports.findByIdForUpdate = async (id, transaction) =>
  StockReceipt.findByPk(id, {
    include: [{ model: StockReceiptItem, as: "items" }],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

exports.create = async (payload, transaction) => {
  const created = await StockReceipt.create(payload, { transaction });
  return StockReceipt.findByPk(created.id, { include, transaction });
};

exports.replaceItems = async (stockReceiptId, items, transaction) => {
  await StockReceiptItem.destroy({ where: { stockReceiptId }, transaction });
  await StockReceiptItem.bulkCreate(
    items.map((item) => ({ ...item, stockReceiptId })),
    { transaction },
  );
};
