const { Op } = require("sequelize");
const models = require("../../database/models");
const decimal = require("../../shared/helpers/decimal.helper");

const {
  Customer,
  CustomerPrice,
  CustomerPayment,
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
