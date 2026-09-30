const models = require("../../../database/models");

const { Role, Permission } = models;

const permissionInclude = [
  {
    model: Permission,
    as: "permissions",
    through: { attributes: [] },
  },
];

const toPublicRole = (role) => {
  if (!role) return null;
  const plain = typeof role.toJSON === "function" ? role.toJSON() : { ...role };
  return {
    id: plain.id,
    name: plain.name,
    description: plain.description,
    status: plain.status,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    permissions: (plain.permissions || []).map((p) => ({
      id: p.id,
      name: p.name,
      module: p.module,
      action: p.action,
      status: p.status,
    })),
  };
};

exports.toPublicRole = toPublicRole;

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await Role.findAndCountAll({
    where,
    include: permissionInclude,
    limit,
    offset,
    order: [["name", "ASC"]],
    distinct: true,
  });
  return { rows: rows.map(toPublicRole), count };
};

exports.findById = async (id) =>
  Role.findByPk(id, { include: permissionInclude });

exports.findByName = async (name) => Role.findOne({ where: { name } });

exports.create = async (payload) => {
  const created = await Role.create(payload);
  return Role.findByPk(created.id, { include: permissionInclude });
};

exports.save = async (role) => {
  await role.save();
  return Role.findByPk(role.id, { include: permissionInclude });
};

exports.destroy = async (role) => role.destroy();
