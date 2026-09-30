const models = require("../../../database/models");

const { RolePermission, Role, Permission } = models;

const include = [
  { model: Role, as: "role", attributes: ["id", "name", "status"] },
  {
    model: Permission,
    as: "permission",
    attributes: ["id", "name", "module", "action", "status"],
  },
];

const toPublic = (row) => {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    roleId: plain.roleId,
    permissionId: plain.permissionId,
    role: plain.role || null,
    permission: plain.permission || null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.toPublic = toPublic;

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await RolePermission.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true,
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id) =>
  RolePermission.findByPk(id, { include });

exports.findByRoleAndPermission = async (roleId, permissionId) =>
  RolePermission.findOne({ where: { roleId, permissionId } });

exports.create = async (payload, { transaction } = {}) =>
  RolePermission.create(payload, { transaction });

exports.destroy = async (row, { transaction } = {}) =>
  row.destroy({ transaction });

exports.destroyByRoleId = async (roleId, { transaction } = {}) =>
  RolePermission.destroy({ where: { roleId }, transaction });

exports.bulkCreate = async (rows, { transaction } = {}) =>
  RolePermission.bulkCreate(rows, { transaction });

exports.countByPermissionId = async (permissionId) =>
  RolePermission.count({ where: { permissionId } });

exports.countByRoleId = async (roleId) =>
  RolePermission.count({ where: { roleId } });
