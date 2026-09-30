const { Op } = require("sequelize");
const models = require("../../database/models");
const decimal = require("../../shared/helpers/decimal.helper");
const vat = require("../../shared/helpers/vat.helper");

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
      attributes: [
        "id",
        "sku",
        "name",
        "brand",
        "size",
        "color",
        "unit",
        "sellingPrice",
        "purchasePrice",
      ],
    },
    {
      model: models.SaleCostAllocation,
      as: "costAllocations",
      required: false,
      include: [
        {
          model: models.StockBatch,
          as: "stockBatch",
          attributes: [
            "id",
            "purchaseDate",
            "unitCost",
            "originalQuantity",
            "remainingQuantity",
            "sourceType",
            "purchaseOrderId",
          ],
        },
      ],
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

const listInclude = [
  { ...itemInclude, separate: true },
  ...include.slice(1),
];

const remainingOf = (plain) =>
  decimal.subMoney(plain.totalAmount, plain.paidAmount);

const linePurchaseCost = (item) => {
  const allocs = item.costAllocations || [];
  let qty = decimal.qty(0);
  let unit = decimal.money(0);
  for (const alloc of allocs) {
    const take = decimal.qty(alloc.quantity || 0);
    if (decimal.cmpQty(take, 0) <= 0) continue;
    unit = decimal.weightedAverage(qty, unit, take, alloc.unitCost || 0);
    qty = decimal.addQty(qty, take);
  }
  if (decimal.cmpQty(qty, 0) > 0) {
    return {
      purchaseUnitCost: unit,
      purchaseTotal: decimal.lineTotal(item.quantity, unit, 0),
    };
  }
  const fallback = decimal.money(item.product?.purchasePrice || 0);
  return {
    purchaseUnitCost: fallback,
    purchaseTotal: decimal.lineTotal(item.quantity, fallback, 0),
  };
};

const calendarDay = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const startOfDay = (value) => {
  const day = calendarDay(value);
  if (!day) return value;
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 0, 0, 0, 0);
};

const endOfDay = (value) => {
  const day = calendarDay(value);
  if (!day) return value;
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 23, 59, 59, 999);
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
    vatRate: vat.rate(),
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
    clientTransactionId: plain.clientTransactionId || null,
    sourceMode: plain.sourceMode || "ONLINE",
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
      ...vat.decorateLine(item.totalPrice),
      ...linePurchaseCost(item),
      product: item.product || null,
      costAllocations: (item.costAllocations || []).map((alloc) => ({
        id: alloc.id,
        stockBatchId: alloc.stockBatchId,
        quantity: alloc.quantity,
        unitCost: alloc.unitCost,
        totalCost: alloc.totalCost,
        costingMethod: alloc.costingMethod,
        purchaseDate: alloc.stockBatch?.purchaseDate || null,
        sourceType: alloc.stockBatch?.sourceType || null,
      })),
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
    if (from) where.saleDate[Op.gte] = startOfDay(from);
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
    include: listInclude,
    limit,
    offset,
    order: [["saleDate", "DESC"]],
    distinct: true,
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id, transaction) =>
  Sale.findByPk(id, { include, transaction });

exports.findByClientTransactionId = async (clientTransactionId, companyId, transaction) => {
  if (!clientTransactionId) return null;
  return Sale.findOne({
    where: { clientTransactionId, companyId },
    include,
    transaction,
  });
};

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
