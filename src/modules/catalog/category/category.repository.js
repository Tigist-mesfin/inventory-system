const { Op } = require("sequelize");
const models = require("../../../database/models");

const { Category, Product } = models;

const toPublic = (category) => {
  if (!category) return null;
  const plain =
    typeof category.toJSON === "function" ? category.toJSON() : { ...category };
  return {
    id: plain.id,
    name: plain.name,
    description: plain.description,
    status: plain.status,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.toPublic = toPublic;

exports.searchWhere = ({ search, status }) => {
  const where = {};
  if (status) where.status = status;
  if (search) where.name = { [Op.like]: `%${search}%` };
  return where;
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await Category.findAndCountAll({
    where,
    limit,
    offset,
    order: [["name", "ASC"]],
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id) => Category.findByPk(id);

exports.findByName = async (name, companyId) =>
  Category.findOne({ where: { name, ...(companyId ? { companyId } : {}) } });

exports.create = async (payload) => Category.create(payload);

exports.save = async (category) => {
  await category.save();
  return category;
};

exports.destroy = async (category) => category.destroy();

exports.countProducts = async (categoryId) =>
  Product.count({ where: { categoryId } });
