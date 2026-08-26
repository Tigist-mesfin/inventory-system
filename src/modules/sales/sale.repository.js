const { Op } = require("sequelize");
const models = require("../../database/models");
const decimal = require("../../shared/helpers/decimal.helper");

const {
  Sale,
  SaleItem,
  Product,
  Warehouse,
  User,
  Customer,
} = models;

const itemInclude = {
  model: SaleItem,
  as: "items",
  include: [
    {
      model: Product,
      as: "product",
      attributes: ["id", "sku", "name", "brand", "size", "color", "unit", "sellingPrice"],
    },
  ],
};

const include = [
  itemInclude,
  { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code", "address"] },
  { model: User, as: "creator", attributes: ["id", "fullName", "username"] },
  {
    model: Customer,
    as: "customer",
    attributes: ["id", "name", "phone", "businessName", "location", "creditLimit"],
    required: false,
  },
];

const remainingOf = (plain) =>
  decimal.subMoney(plain.totalAmount, plain.paidAmount);

const endOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (String(value).length <= 10) date.setHours(23, 59, 59, 999);
  return date;
};

const toPublic = (sale) => {
  if (!sale) return null;
  const plain = typeof sale.toJSON === "function" ? sale.toJSON() : { ...sale };
  return {
    id: plain.id,
    warehouseId: plain.warehouseId,
    createdBy: plain.createdBy,
    customerId: plain.customerId,
    invoiceNumber: plain.invoiceNumber,
    customerName: plain.customerName,
    customerPhone: plain.customerPhone,
    saleDate: plain.saleDate,
    dueDate: plain.dueDate,
    subtotal: plain.subtotal,
    taxAmount: plain.taxAmount,
    discountAmount: plain.discountAmount,
    totalAmount: plain.totalAmount,
    paidAmount: plain.paidAmount,
    remainingBalance: remainingOf(plain),
    paymentStatus:
      decimal.cmpMoney(plain.paidAmount, 0) <= 0
        ? "UNPAID"
        : decimal.cmpMoney(plain.paidAmount, plain.totalAmount) >= 0
          ? "PAID"
          : "PARTIAL",
    paymentMethod: plain.paymentMethod,
    status: plain.status,
    notes: plain.notes,
    warehouse: plain.warehouse || null,
    creator: plain.creator || null,
    customer: plain.customer || null,
    items: (plain.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      totalPrice: item.totalPrice,
      product: item.product || null,
    })),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.toPublic = toPublic;
exports.include = include;

exports.searchWhere = ({
  search,
  status,
  warehouseId,
  customerId,
  createdBy,
  paymentMethod,
  from,
  to,
}) => {
  const where = {};
  if (status) where.status = status;
  if (warehouseId) where.warehouseId = warehouseId;
  if (customerId) where.customerId = customerId;
  if (createdBy) where.createdBy = createdBy;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (from || to) {
    where.saleDate = {};
    if (from) where.saleDate[Op.gte] = from;
    if (to) where.saleDate[Op.lte] = endOfDay(to);
  }
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [
      { invoiceNumber: like },
      { customerName: like },
      { customerPhone: like },
    ];
  }
  return where;
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await Sale.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [["saleDate", "DESC"]],
    distinct: true,
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id, transaction) =>
  Sale.findByPk(id, { include, transaction });

exports.findByIdForUpdate = async (id, transaction) =>
  Sale.findByPk(id, {
    include: [itemInclude],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

exports.create = async (payload, transaction) => {
  const created = await Sale.create(payload, { transaction });
  return Sale.findByPk(created.id, { include, transaction });
};

exports.replaceItems = async (saleId, items, transaction) => {
  await SaleItem.destroy({ where: { saleId }, transaction });
  if (items.length) {
    await SaleItem.bulkCreate(
      items.map((item) => ({ ...item, saleId })),
      { transaction },
    );
  }
};

exports.save = async (sale, transaction) => {
  await sale.save({ transaction });
  return Sale.findByPk(sale.id, { include, transaction });
};
