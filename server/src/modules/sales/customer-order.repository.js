const { Op } = require("sequelize");
const models = require("../../database/models");
const decimal = require("../../shared/helpers/decimal.helper");
const vat = require("../../shared/helpers/vat.helper");

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

const settlePaid = (totalAmount, paidAmount) => {
  const total = decimal.money(totalAmount);
  let paid = decimal.money(paidAmount || 0);
  if (decimal.cmpMoney(paid, total) > 0) {
    const over = decimal.subMoney(paid, total);
    if (decimal.cmpMoney(over, "0.02") <= 0) paid = total;
  }
  return { total, paid, paymentStatus: paymentStatusOf(total, paid) };
};

const include = [
  {
    model: CustomerOrderItem,
    as: "items",
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["id", "sku", "name", "unit", "sellingPrice", "brand", "size", "color"],
      },
    ],
  },
  { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"], required: false },
  { model: User, as: "approver", attributes: ["id", "fullName", "username"], required: false },
  { model: PaymentMethod, as: "paymentMethod", attributes: ["id", "name"], required: false },
  { model: Sale, as: "sale", attributes: ["id", "invoiceNumber", "status", "saleDate", "totalAmount", "paidAmount"], required: false },
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
  const computed = vat.apply(plain.subtotal);
  const storedIncludesVat =
    decimal.cmpMoney(plain.totalAmount, plain.subtotal) !== 0;
  const totalAmount = storedIncludesVat
    ? plain.totalAmount
    : computed.totalAmount;
  const taxAmount = storedIncludesVat
    ? decimal.subMoney(plain.totalAmount, plain.subtotal)
    : computed.taxAmount;
  const paidAmount = plain.paidAmount || 0;
  const salePaid =
    plain.sale?.paidAmount != null ? plain.sale.paidAmount : paidAmount;
  const saleTotal =
    plain.sale?.totalAmount != null ? plain.sale.totalAmount : totalAmount;
  const dueForPayment =
    decimal.cmpMoney(saleTotal, plain.subtotal) === 0
      ? computed.totalAmount
      : saleTotal;
  const paymentStatus = paymentStatusOf(dueForPayment, salePaid);
  return {
    id: plain.id,
    orderNumber: plain.orderNumber,
    customerName: plain.customerName,
    customerPhone: plain.customerPhone,
    deliveryDate: plain.deliveryDate,
    warehouseId: plain.warehouseId,
    saleId: plain.saleId,
    status: plain.status,
    paymentStatus,
    subtotal: plain.subtotal,
    taxAmount,
    vatRate: vat.rate(),
    totalAmount: dueForPayment,
    paidAmount: salePaid,
    remainingBalance: decimal.subMoney(dueForPayment, salePaid),
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
      ...vat.decorateLine(item.totalPrice),
      product: item.product || null,
    })),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.paymentStatusOf = paymentStatusOf;
exports.settlePaid = settlePaid;
exports.toPublic = toPublic;
exports.include = include;

exports.searchWhere = ({ search, status, paymentStatus, from, to }) => {
  const where = {};
  if (status === "SOLD") where.status = "ON_LOADING";
  else if (status === "REJECTED") where.status = "CANCELLED";
  else if (status) where.status = status;
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

exports.findByIdForUpdate = async (id, transaction) => {
  // Lock header only — locking with JOINs is unreliable on MySQL/MariaDB.
  const order = await CustomerOrder.findByPk(id, {
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  if (!order) return null;
  const items = await CustomerOrderItem.findAll({
    where: { customerOrderId: order.id },
    transaction,
  });
  // Prefer association setter so `.items` is always readable.
  if (typeof order.setItems === "function") {
    order.setItems(items);
  } else {
    order.items = items;
    order.setDataValue("items", items);
  }
  return order;
};

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
