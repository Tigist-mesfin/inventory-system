const { Op } = require("sequelize");
const models = require("../../../database/models");

const { Supplier, PurchaseOrder } = models;

const toPublic = (supplier) => {
  if (!supplier) return null;
  const plain =
    typeof supplier.toJSON === "function" ? supplier.toJSON() : { ...supplier };
  return {
    id: plain.id,
    name: plain.name,
    contactPerson: plain.contactPerson,
    email: plain.email,
    phone: plain.phone,
    address: plain.address,
    paymentTerms: plain.paymentTerms,
    status: plain.status,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.toPublic = toPublic;

exports.searchWhere = ({ search, status }) => {
  const where = {};
  if (status) where.status = status;
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [
      { name: like },
      { contactPerson: like },
      { email: like },
      { phone: like },
    ];
  }
  return where;
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await Supplier.findAndCountAll({
    where,
    limit,
    offset,
    order: [["name", "ASC"]],
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id) => Supplier.findByPk(id);

exports.create = async (payload, transaction) =>
  Supplier.create(payload, { transaction });

exports.save = async (supplier) => {
  await supplier.save();
  return supplier;
};

exports.destroy = async (supplier) => supplier.destroy();

exports.countPurchaseOrders = async (supplierId) =>
  PurchaseOrder.count({ where: { supplierId } });
