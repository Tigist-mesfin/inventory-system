const AppError = require("../../../shared/errors/AppError");
const paginate = require("../../../shared/helpers/pagination.helper");
const permissionRepository = require("./permission.repository");
const rolePermissionRepository = require("../role-permission/role-permission.repository");

exports.list = async (query) => {
  const { page, limit, offset } = paginate(query);
  const where = permissionRepository.searchWhere(query);
  const { rows, count } = await permissionRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("permissions", rows, count, page, limit);
};

exports.getById = async (id) => {
  const permission = await permissionRepository.findById(id);
  if (!permission) throw AppError.notFound("Permission not found");
  return permissionRepository.toPublicPermission(permission);
};

exports.create = async (payload) => {
  const existing = await permissionRepository.findByModuleAction(
    payload.module,
    payload.action,
  );
  if (existing) throw AppError.conflict("Permission already exists");

  const permission = await permissionRepository.create({
    name: `${payload.module}:${payload.action}`,
    module: payload.module,
    action: payload.action,
    description: payload.description || null,
    status: payload.status || "ACTIVE",
  });

  return permissionRepository.toPublicPermission(permission);
};

exports.update = async (id, payload) => {
  const permission = await permissionRepository.findById(id);
  if (!permission) throw AppError.notFound("Permission not found");

  if (payload.description !== undefined) {
    permission.description = payload.description;
  }
  if (payload.status !== undefined) permission.status = payload.status;

  const saved = await permissionRepository.save(permission);
  return permissionRepository.toPublicPermission(saved);
};

exports.remove = async (id) => {
  const permission = await permissionRepository.findById(id);
  if (!permission) throw AppError.notFound("Permission not found");

  const assigned = await rolePermissionRepository.countByPermissionId(id);
  if (assigned > 0) {
    throw AppError.conflict(
      "Permission is assigned to roles and cannot be deleted; deactivate it instead",
    );
  }

  await permissionRepository.destroy(permission);
  return { deleted: true };
};
