const { Op } = require("sequelize");
const models = require("../../database/models");
const decimal = require("../../shared/helpers/decimal.helper");

const {
  PurchaseOrder,
  PurchaseOrderItem,
  Product,
  Supplier,
  User,
  Warehouse,
} = models;

const include = [
  {
    model: PurchaseOrderItem,
    as: "items",
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["id", "sku", "name", "brand", "size", "color", "unit"],
      },
      { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
    ],
  },
  { model: Supplier, as: "supplier", attributes: ["id", "name", "phone", "status"] },
  { model: User, as: "creator", attributes: ["id", "fullName", "username"] },
];

const toPublic = (row) => {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    supplierId: plain.supplierId,
    createdBy: plain.createdBy,
    orderNumber: plain.orderNumber,
    orderDate: plain.orderDate,
    expectedDate: plain.expectedDate,
    dueDate: plain.dueDate,
    subtotal: plain.subtotal,
    taxAmount: plain.taxAmount,
    discountAmount: plain.discountAmount,
    totalAmount: plain.totalAmount,
    paidAmount: plain.paidAmount,
    remainingBalance: decimal.subMoney(plain.totalAmount, plain.paidAmount || 0),
    paymentMethod: plain.paymentMethod || null,
    paymentStatus:
      decimal.cmpMoney(plain.paidAmount || 0, 0) <= 0
        ? "UNPAID"
        : decimal.cmpMoney(plain.paidAmount, plain.totalAmount) >= 0
          ? "PAID"
          : "PARTIAL",
    status: plain.status,
    notes: plain.notes,
    supplier: plain.supplier || null,
    creator: plain.creator || null,
    items: (plain.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      receivedQuantity: item.receivedQuantity,
      remainingQuantity: decimal.subQty(item.quantity, item.receivedQuantity),
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      deliveryStatus: item.deliveryStatus || "NOT_DELIVERED",
      warehouseId: item.warehouseId || null,
      warehouse: item.warehouse || null,
      product: item.product || null,
    })),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.toPublic = toPublic;
exports.include = include;

const endOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (String(value).length <= 10) date.setHours(23, 59, 59, 999);
  return date;
};

exports.searchWhere = ({ search, status, supplierId, paymentMethod, createdBy, from, to }) => {
  const where = {};
  if (status) where.status = status;
  if (supplierId) where.supplierId = supplierId;
  if (createdBy) where.createdBy = createdBy;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (from || to) {
    where.orderDate = {};
    if (from) where.orderDate[Op.gte] = from;
    if (to) where.orderDate[Op.lte] = endOfDay(to);
  }
  if (search) where.orderNumber = { [Op.like]: `%${search}%` };
  return where;
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await PurchaseOrder.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [["orderDate", "DESC"]],
    distinct: true,
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id, transaction) =>
  PurchaseOrder.findByPk(id, { include, transaction });

exports.findByIdForUpdate = async (id, transaction) =>
  PurchaseOrder.findByPk(id, {
    include: [{ model: PurchaseOrderItem, as: "items" }],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

exports.findItemById = async (id, transaction) =>
  PurchaseOrderItem.findByPk(id, {
    include: [
      { model: Product, as: "product", attributes: ["id", "sku", "name", "unit"] },
      { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
      {
        model: PurchaseOrder,
        as: "purchaseOrder",
        attributes: ["id", "orderNumber", "status"],
      },
    ],
    transaction,
  });

exports.countUndelivered = async () =>
  PurchaseOrderItem.count({
    where: { deliveryStatus: { [Op.ne]: "DELIVERED" } },
    include: [
      {
        model: PurchaseOrder,
        as: "purchaseOrder",
        attributes: [],
        where: { status: { [Op.ne]: "CANCELLED" } },
        required: true,
      },
    ],
    distinct: true,
  });

exports.deliverySummary = async (poWhere) => {
  const rows = await PurchaseOrderItem.findAll({
    include: [
      { model: Product, as: "product", attributes: ["id", "name", "unit"] },
      {
        model: PurchaseOrder,
        as: "purchaseOrder",
        attributes: [],
        where: poWhere,
        required: true,
      },
    ],
  });

  const emptyBucket = () => ({ count: 0, items: {} });
  const buckets = {
    NOT_DELIVERED: emptyBucket(),
    ON_LOADING: emptyBucket(),
    DELIVERED: emptyBucket(),
  };

  for (const row of rows) {
    const status = buckets[row.deliveryStatus] ? row.deliveryStatus : "NOT_DELIVERED";
    const bucket = buckets[status];
    bucket.count += 1;
    const productId = row.productId;
    if (!bucket.items[productId]) {
      bucket.items[productId] = {
        productId,
        name: row.product?.name || "Item",
        unit: row.product?.unit || "",
        lines: 0,
        quantity: decimal.qty(0),
      };
    }
    bucket.items[productId].lines += 1;
    bucket.items[productId].quantity = decimal.addQty(
      bucket.items[productId].quantity,
      row.quantity,
    );
  }

  const toPublic = (bucket) => ({
    count: bucket.count,
    items: Object.values(bucket.items).sort((a, b) => a.name.localeCompare(b.name)),
  });

  return {
    notDelivered: toPublic(buckets.NOT_DELIVERED),
    onLoading: toPublic(buckets.ON_LOADING),
    delivered: toPublic(buckets.DELIVERED),
    undeliveredCount: buckets.NOT_DELIVERED.count + buckets.ON_LOADING.count,
  };
};

exports.create = async (payload, transaction) => {
  const created = await PurchaseOrder.create(payload, { transaction });
  return PurchaseOrder.findByPk(created.id, { include, transaction });
};

exports.replaceItems = async (purchaseOrderId, items, transaction) => {
  await PurchaseOrderItem.destroy({ where: { purchaseOrderId }, transaction });
  await PurchaseOrderItem.bulkCreate(
    items.map((item) => ({
      ...item,
      purchaseOrderId,
      receivedQuantity: item.receivedQuantity ?? 0,
      deliveryStatus: item.deliveryStatus || "NOT_DELIVERED",
      warehouseId: item.warehouseId || null,
    })),
    { transaction },
  );
};

exports.save = async (row, transaction) => {
  await row.save({ transaction });
  return PurchaseOrder.findByPk(row.id, { include, transaction });
};
