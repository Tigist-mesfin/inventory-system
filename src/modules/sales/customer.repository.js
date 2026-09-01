const { Op } = require("sequelize");
const models = require("../../database/models");
const decimal = require("../../shared/helpers/decimal.helper");

const {
  Customer,
  CustomerPrice,
  CustomerPayment,
  CustomerWalletTransaction,
  Sale,
  Product,
  User,
  PurchaseOrder,
} = models;

const toPublic = (customer, extras = {}) => {
  if (!customer) return null;
  const plain =
    typeof customer.toJSON === "function" ? customer.toJSON() : { ...customer };
  return {
    id: plain.id,
    name: plain.name,
    phone: plain.phone,
    businessName: plain.businessName,
    location: plain.location,
    creditLimit: plain.creditLimit,
    walletBalance: decimal.money(plain.walletBalance || 0),
    notes: plain.notes,
    status: plain.status,
    type: plain.type || "CUSTOMER",
    supplierId: plain.supplierId || null,
    createdBy: plain.createdBy,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    ...extras,
  };
};

exports.toPublic = toPublic;

exports.searchWhere = ({ search, status, type }) => {
  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [
      { name: like },
      { phone: like },
      { businessName: like },
      { location: like },
    ];
  }
  return where;
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await Customer.findAndCountAll({
    where,
    limit,
    offset,
    order: [["name", "ASC"]],
  });
  return { rows, count };
};

exports.findById = async (id) => Customer.findByPk(id);

exports.findByIdForUpdate = async (id, transaction) =>
  Customer.findByPk(id, {
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

exports.create = async (payload, transaction) =>
  Customer.create(payload, { transaction });

exports.save = async (customer) => {
  await customer.save();
  return customer;
};

exports.destroy = async (customer) => customer.destroy();

exports.countSales = async (customerId) =>
  Sale.count({ where: { customerId } });

exports.debtAndHistory = async (customer) => {
  if (customer.type === "SUPPLIER") {
    if (!customer.supplierId) {
      return {
        debt: decimal.money(0),
        remainingBalance: decimal.money(0),
        paymentStanding: "SETTLED",
        lastPurchaseAt: null,
        salesCount: 0,
      };
    }
    const [orders, lastOrder, orderCount] = await Promise.all([
      PurchaseOrder.findAll({
        where: {
          supplierId: customer.supplierId,
          status: { [Op.ne]: "CANCELLED" },
        },
      }),
      PurchaseOrder.findOne({
        where: {
          supplierId: customer.supplierId,
          status: { [Op.ne]: "CANCELLED" },
        },
        order: [["orderDate", "DESC"]],
      }),
      PurchaseOrder.count({
        where: {
          supplierId: customer.supplierId,
          status: { [Op.ne]: "CANCELLED" },
        },
      }),
    ]);
    const remainingOrders = orders.filter(
      (order) =>
        decimal.cmpMoney(decimal.subMoney(order.totalAmount, order.paidAmount || 0), 0) > 0,
    );
    const debt = remainingOrders.reduce(
      (sum, order) =>
        decimal.addMoney(sum, decimal.subMoney(order.totalAmount, order.paidAmount || 0)),
      decimal.money(0),
    );
    const hasPartial = remainingOrders.some(
      (order) => decimal.cmpMoney(order.paidAmount || 0, 0) > 0,
    );
    return {
      debt,
      remainingBalance: debt,
      paymentStanding:
        decimal.cmpMoney(debt, 0) <= 0
          ? "SETTLED"
          : hasPartial
            ? "PARTIAL"
            : "UNPAID",
      lastPurchaseAt: lastOrder ? lastOrder.orderDate : null,
      salesCount: orderCount,
    };
  }

  const customerId = customer.id;
  const [openSales, lastSale, salesCount] = await Promise.all([
    Sale.findAll({
      where: { customerId, status: "COMPLETED" },
    }),
    Sale.findOne({
      where: { customerId, status: "COMPLETED" },
      order: [["saleDate", "DESC"]],
    }),
    Sale.count({ where: { customerId, status: "COMPLETED" } }),
  ]);
  const remainingSales = openSales.filter(
    (sale) => decimal.cmpMoney(decimal.subMoney(sale.totalAmount, sale.paidAmount), 0) > 0,
  );
  const debt = remainingSales.reduce(
    (sum, sale) =>
      decimal.addMoney(sum, decimal.subMoney(sale.totalAmount, sale.paidAmount)),
    decimal.money(0),
  );
  const hasPartial = remainingSales.some(
    (sale) => decimal.cmpMoney(sale.paidAmount, 0) > 0,
  );
  return {
    debt,
    remainingBalance: debt,
    paymentStanding:
      decimal.cmpMoney(debt, 0) <= 0
        ? "SETTLED"
        : hasPartial
          ? "PARTIAL"
          : "UNPAID",
    lastPurchaseAt: lastSale ? lastSale.saleDate : null,
    salesCount,
  };
};

exports.listPrices = async (customerId) => {
  const rows = await CustomerPrice.findAll({
    where: { customerId },
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["id", "sku", "name", "brand", "size", "color", "sellingPrice"],
      },
    ],
    order: [
      ["productId", "ASC"],
      ["minQuantity", "ASC"],
    ],
  });
  return rows.map((row) => {
    const plain = row.toJSON();
    return {
      id: plain.id,
      productId: plain.productId,
      unitPrice: plain.unitPrice,
      minQuantity: plain.minQuantity,
      product: plain.product || null,
    };
  });
};

exports.replacePrices = async (customerId, prices, transaction) => {
  await CustomerPrice.destroy({ where: { customerId }, transaction });
  if (!prices.length) return [];
  await CustomerPrice.bulkCreate(
    prices.map((price) => ({ ...price, customerId })),
    { transaction },
  );
  return exports.listPrices(customerId);
};

exports.listPayments = async (customerId) => {
  const rows = await CustomerPayment.findAll({
    where: { customerId },
    include: [
      {
        model: User,
        as: "recorder",
        attributes: ["id", "fullName", "username"],
      },
    ],
    order: [["paidAt", "DESC"]],
  });
  return rows.map((row) => row.toJSON());
};

exports.createPayment = async (payload, transaction) =>
  CustomerPayment.create(payload, { transaction });

exports.createWalletTransaction = async (payload, transaction) =>
  CustomerWalletTransaction.create(payload, { transaction });

const walletInclude = [
  {
    model: Customer,
    as: "customer",
    attributes: ["id", "name", "phone"],
  },
  {
    model: User,
    as: "recorder",
    attributes: ["id", "fullName", "username"],
  },
  {
    model: Sale,
    as: "sale",
    attributes: ["id", "invoiceNumber"],
    required: false,
  },
];

const toWalletPublic = (row) => {
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    customerId: plain.customerId,
    saleId: plain.saleId,
    type: plain.type,
    amount: plain.amount,
    method: plain.method,
    reason: plain.reason,
    occurredAt: plain.occurredAt,
    createdAt: plain.createdAt,
    customer: plain.customer || null,
    recorder: plain.recorder || null,
    sale: plain.sale || null,
  };
};

exports.toWalletPublic = toWalletPublic;

exports.walletSearchWhere = ({ customerId, type, from, to }) => {
  const where = {};
  if (customerId) where.customerId = customerId;
  if (type) where.type = type;
  if (from || to) {
    where.occurredAt = {};
    if (from) where.occurredAt[Op.gte] = from;
    if (to) {
      const end = new Date(to);
      if (String(to).length <= 10) end.setHours(23, 59, 59, 999);
      where.occurredAt[Op.lte] = end;
    }
  }
  return where;
};

exports.applyWalletTextSearch = async (where, search, companyId) => {
  if (!search) return where;
  const like = { [Op.like]: `%${search}%` };
  const customerWhere = {
    [Op.or]: [{ name: like }, { phone: like }],
  };
  if (companyId) customerWhere.companyId = companyId;
  const rows = await Customer.findAll({
    where: customerWhere,
    attributes: ["id"],
    raw: true,
  });
  const ids = rows.map((row) => row.id);
  where[Op.or] = [
    { method: like },
    { reason: like },
    ...(ids.length ? [{ customerId: { [Op.in]: ids } }] : []),
  ];
  return where;
};

exports.findWalletTransactions = async ({ where, limit, offset }) => {
  const { rows, count } = await CustomerWalletTransaction.findAndCountAll({
    where,
    include: walletInclude,
    limit,
    offset,
    order: [["occurredAt", "DESC"], ["createdAt", "DESC"]],
    distinct: true,
  });
  return { rows: rows.map(toWalletPublic), count };
};

exports.listWalletTransactions = async (customerId) => {
  const rows = await CustomerWalletTransaction.findAll({
    where: { customerId },
    include: walletInclude,
    order: [["occurredAt", "DESC"], ["createdAt", "DESC"]],
  });
  return rows.map(toWalletPublic);
};

exports.findSaleWalletDebits = async (saleId, transaction) =>
  CustomerWalletTransaction.findAll({
    where: { saleId, type: "SALE" },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

exports.findCreditSaleForUpdate = async (saleId, customerId, transaction) =>
  Sale.findOne({
    where: { id: saleId, customerId, status: "COMPLETED" },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

exports.findOldestOpenCreditSales = async (customerId, transaction) =>
  Sale.findAll({
    where: {
      customerId,
      status: "COMPLETED",
    },
    lock: transaction.LOCK.UPDATE,
    transaction,
    order: [["dueDate", "ASC"], ["saleDate", "ASC"]],
  });
