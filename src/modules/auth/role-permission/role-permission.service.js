const AppError = require("../../../shared/errors/AppError");
const paginate = require("../../../shared/helpers/pagination.helper");
const { sequelize } = require("../../../database");
const rolePermissionRepository = require("./role-permission.repository");
const roleRepository = require("../role/role.repository");
const permissionRepository = require("../permission/permission.repository");

exports.list = async (query) => {
  const { page, limit, offset } = paginate(query);
  const where = {};
  if (query.roleId) where.roleId = query.roleId;
  if (query.permissionId) where.permissionId = query.permissionId;

  const { rows, count } = await rolePermissionRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("rolePermissions", rows, count, page, limit);
};

exports.getById = async (id) => {
  const row = await rolePermissionRepository.findById(id);
  if (!row) throw AppError.notFound("Role permission not found");
  return rolePermissionRepository.toPublic(row);
};

const assertRoleAndPermission = async (roleId, permissionId) => {
  const role = await roleRepository.findById(roleId);
  if (!role) throw AppError.notFound("Role not found");
  const permission = await permissionRepository.findById(permissionId);
  if (!permission) throw AppError.notFound("Permission not found");
  return { role, permission };
};

exports.assign = async ({ roleId, permissionId }) => {
  await assertRoleAndPermission(roleId, permissionId);

  const existing = await rolePermissionRepository.findByRoleAndPermission(
    roleId,
    permissionId,
  );
  if (existing) throw AppError.conflict("Permission is already assigned to this role");

  const created = await rolePermissionRepository.create({ roleId, permissionId });
  const row = await rolePermissionRepository.findById(created.id);
  return rolePermissionRepository.toPublic(row);
};

exports.replaceForRole = async (roleId, permissionIds) => {
  const role = await roleRepository.findById(roleId);
  if (!role) throw AppError.notFound("Role not found");

  const uniqueIds = [...new Set(permissionIds)];
  if (uniqueIds.length) {
    const permissions = await permissionRepository.findByIds(uniqueIds);
    if (permissions.length !== uniqueIds.length) {
      throw AppError.badRequest("One or more permissions were not found");
    }
  }

  await sequelize.transaction(async (transaction) => {
    await rolePermissionRepository.destroyByRoleId(roleId, { transaction });
    if (uniqueIds.length) {
      await rolePermissionRepository.bulkCreate(
        uniqueIds.map((permissionId) => ({ roleId, permissionId })),
        { transaction },
      );
    }
  });
};

exports.remove = async (id) => {
  const row = await rolePermissionRepository.findById(id);
  if (!row) throw AppError.notFound("Role permission not found");
  await rolePermissionRepository.destroy(row);
  return { deleted: true };
};
