const { Op } = require("sequelize");
const AppError = require("../../../shared/errors/AppError");
const paginate = require("../../../shared/helpers/pagination.helper");
const roleRepository = require("./role.repository");
const userRepository = require("../user/user.repository");
const rolePermissionService = require("../role-permission/role-permission.service");

const ADMIN_NAME = "ADMIN";

exports.list = async (query) => {
  const { page, limit, offset } = paginate(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where.name = { [Op.like]: `%${query.search}%` };
  }
  const { rows, count } = await roleRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("roles", rows, count, page, limit);
};

exports.getById = async (id) => {
  const role = await roleRepository.findById(id);
  if (!role) throw AppError.notFound("Role not found");
  return roleRepository.toPublicRole(role);
};

exports.create = async (payload) => {
  const name = payload.name.trim().toUpperCase();
  const existing = await roleRepository.findByName(name);
  if (existing) throw AppError.conflict("name is already in use");

  const role = await roleRepository.create({
    name,
    description: payload.description || null,
    status: payload.status || "ACTIVE",
  });

  if (payload.permissionIds?.length) {
    await rolePermissionService.replaceForRole(role.id, payload.permissionIds);
  }

  return exports.getById(role.id);
};

exports.update = async (id, payload) => {
  const role = await roleRepository.findById(id);
  if (!role) throw AppError.notFound("Role not found");

  if (role.name === ADMIN_NAME) {
    if (payload.name && payload.name.trim().toUpperCase() !== ADMIN_NAME) {
      throw AppError.forbidden("Cannot rename the ADMIN role");
    }
    if (payload.status && payload.status !== "ACTIVE") {
      throw AppError.forbidden("Cannot deactivate the ADMIN role");
    }
  }

  if (payload.name) {
    const name = payload.name.trim().toUpperCase();
    if (name !== role.name) {
      const taken = await roleRepository.findByName(name);
      if (taken) throw AppError.conflict("name is already in use");
      role.name = name;
    }
  }

  if (payload.description !== undefined) role.description = payload.description;
  if (payload.status !== undefined) role.status = payload.status;

  const saved = await roleRepository.save(role);
  return roleRepository.toPublicRole(saved);
};

exports.setPermissions = async (id, permissionIds) => {
  const role = await roleRepository.findById(id);
  if (!role) throw AppError.notFound("Role not found");
  await rolePermissionService.replaceForRole(id, permissionIds);
  return exports.getById(id);
};

exports.remove = async (id) => {
  const role = await roleRepository.findById(id);
  if (!role) throw AppError.notFound("Role not found");
  if (role.name === ADMIN_NAME) {
    throw AppError.forbidden("Cannot delete the ADMIN role");
  }

  const users = await userRepository.countByRoleId(id);
  if (users > 0) {
    throw AppError.conflict("Role is assigned to users and cannot be deleted");
  }

  await roleRepository.destroy(role);
  return { deleted: true };
};
