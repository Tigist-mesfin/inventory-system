const { Op } = require("sequelize");
const models = require("../../database/models");
const decimal = require("../../shared/helpers/decimal.helper");

const {
  CustomerOrder,
  CustomerOrderItem,
  Product,
  Warehouse,
  User,
  PaymentMethod,
  Sale,
} = models;

const paymentStatusOf = (totalAmount, paidAmount) => {
  if (decimal.cmpMoney(paidAmount, 0) <= 0) return "UNPAID";
  if (decimal.cmpMoney(paidAmount, totalAmount) >= 0) return "PAID";
  return "PARTIAL";
};

const include = [
  {
    model: CustomerOrderItem,
    as: "items",
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["id", "sku", "name", "unit", "sellingPrice"],
      },
    ],
  },
  { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"], required: false },
  { model: User, as: "approver", attributes: ["id", "fullName", "username"], required: false },
  { model: PaymentMethod, as: "paymentMethod", attributes: ["id", "name"], required: false },
  { model: Sale, as: "sale", attributes: ["id", "invoiceNumber", "status"], required: false },
];

const endOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (String(value).length <= 10) date.setHours(23, 59, 59, 999);
  return date;
};

const toPublic = (row) => {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    orderNumber: plain.orderNumber,
    customerName: plain.customerName,
    customerPhone: plain.customerPhone,
    deliveryDate: plain.deliveryDate,
    warehouseId: plain.warehouseId,
    saleId: plain.saleId,
    status: plain.status,
    paymentStatus: plain.paymentStatus,
    subtotal: plain.subtotal,
    totalAmount: plain.totalAmount,
    paidAmount: plain.paidAmount,
    remainingBalance: decimal.subMoney(plain.totalAmount, plain.paidAmount || 0),
    notes: plain.notes,
    approvedAt: plain.approvedAt,
    warehouse: plain.warehouse || null,
    approver: plain.approver || null,
    paymentMethod: plain.paymentMethod || null,
    sale: plain.sale || null,
    items: (plain.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      product: item.product || null,
    })),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.paymentStatusOf = paymentStatusOf;
exports.toPublic = toPublic;
exports.include = include;

exports.searchWhere = ({ search, status, paymentStatus, from, to }) => {
  const where = {};
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (from || to) {
    where.deliveryDate = {};
    if (from) where.deliveryDate[Op.gte] = from;
    if (to) where.deliveryDate[Op.lte] = endOfDay(to);
  }
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [
      { orderNumber: like },
      { customerName: like },
      { customerPhone: like },
    ];
  }
  return where;
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await CustomerOrder.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true,
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id, transaction) =>
  CustomerOrder.findByPk(id, { include, transaction });

exports.findByIdForUpdate = async (id, transaction) =>
  CustomerOrder.findByPk(id, {
    include: [{ model: CustomerOrderItem, as: "items" }],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

exports.create = async (payload, transaction) => {
  const created = await CustomerOrder.create(payload, { transaction });
  return CustomerOrder.findByPk(created.id, { include, transaction });
};

exports.replaceItems = async (customerOrderId, items, transaction) => {
  await CustomerOrderItem.destroy({ where: { customerOrderId }, transaction });
  await CustomerOrderItem.bulkCreate(
    items.map((item) => ({ ...item, customerOrderId })),
    { transaction },
  );
};

exports.save = async (row, transaction) => {
  await row.save({ transaction });
  return CustomerOrder.findByPk(row.id, { include, transaction });
};
