const { Op } = require("sequelize");
const models = require("../../../database/models");

const { Permission } = models;

const toPublicPermission = (permission) => {
  if (!permission) return null;
  const plain =
    typeof permission.toJSON === "function"
      ? permission.toJSON()
      : { ...permission };
  return {
    id: plain.id,
    name: plain.name,
    module: plain.module,
    action: plain.action,
    description: plain.description,
    status: plain.status,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.toPublicPermission = toPublicPermission;

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await Permission.findAndCountAll({
    where,
    limit,
    offset,
    order: [
      ["module", "ASC"],
      ["action", "ASC"],
    ],
  });
  return { rows: rows.map(toPublicPermission), count };
};

exports.searchWhere = ({ search, module, action, status }) => {
  const where = {};
  if (module) where.module = module;
  if (action) where.action = action;
  if (status) where.status = status;
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [{ name: like }, { module: like }, { description: like }];
  }
  return where;
};

exports.findById = async (id) => Permission.findByPk(id);

exports.findByModuleAction = async (moduleName, action) =>
  Permission.findOne({ where: { module: moduleName, action } });

exports.findByIds = async (ids) =>
  Permission.findAll({ where: { id: ids } });

exports.create = async (payload) => Permission.create(payload);

exports.save = async (permission) => {
  await permission.save();
  return permission;
};

exports.destroy = async (permission) => permission.destroy();
