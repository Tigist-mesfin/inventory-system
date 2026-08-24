const AppError = require("../../../shared/errors/AppError");
const paginate = require("../../../shared/helpers/pagination.helper");
const phoneNormalize = require("../../../shared/helpers/phoneNormalize.helper");
const userRepository = require("./user.repository");
const roleRepository = require("../role/role.repository");
const authRepository = require("../auth.repository");

const normalizePhone = (phone) => {
  const normalized = phoneNormalize(phone);
  if (!normalized) throw AppError.badRequest("Invalid phone number");
  return normalized;
};

const assertNotLastActiveAdmin = async (user, nextStatus, nextRoleId) => {
  const adminRole = await userRepository.findAdminRole();
  if (!adminRole || user.roleId !== adminRole.id) return;
  if (user.status !== "ACTIVE") return;

  const leavingAdmin =
    (nextStatus && nextStatus !== "ACTIVE") ||
    (nextRoleId && nextRoleId !== adminRole.id);

  if (!leavingAdmin) return;

  const remaining = await userRepository.countActiveAdmins(adminRole.id, user.id);
  if (remaining < 1) {
    throw AppError.conflict("Cannot remove or deactivate the last active ADMIN user");
  }
};

exports.list = async (query) => {
  const { page, limit, offset } = paginate(query);
  const where = userRepository.searchWhere(query);
  const { rows, count } = await userRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("users", rows, count, page, limit);
};

exports.getById = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) throw AppError.notFound("User not found");
  return userRepository.toPublicUser(user);
};

exports.create = async (payload) => {
  const existing = await userRepository.findByUsername(payload.username);
  if (existing) throw AppError.conflict("username is already in use");

  const role = await roleRepository.findById(payload.roleId);
  if (!role) throw AppError.badRequest("Role not found");
  if (role.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot assign an inactive role");
  }

  const user = await userRepository.create({
    fullName: payload.fullName,
    username: payload.username,
    phone: normalizePhone(payload.phone),
    password: payload.password,
    roleId: payload.roleId,
    status: payload.status || "ACTIVE",
  });

  return userRepository.toPublicUser(user);
};

exports.update = async (id, payload, actor) => {
  const user = await userRepository.findById(id);
  if (!user) throw AppError.notFound("User not found");

  if (payload.username && payload.username !== user.username) {
    const taken = await userRepository.findByUsername(payload.username);
    if (taken) throw AppError.conflict("username is already in use");
  }

  if (payload.roleId && payload.roleId !== user.roleId) {
    const role = await roleRepository.findById(payload.roleId);
    if (!role) throw AppError.badRequest("Role not found");
    if (role.status !== "ACTIVE") {
      throw AppError.badRequest("Cannot assign an inactive role");
    }
  }

  if (actor?.id === user.id) {
    if (payload.status && payload.status !== "ACTIVE") {
      throw AppError.forbidden("You cannot deactivate your own account");
    }
    if (payload.roleId && payload.roleId !== user.roleId) {
      throw AppError.forbidden("You cannot change your own role");
    }
  }

  await assertNotLastActiveAdmin(user, payload.status, payload.roleId);

  if (payload.fullName !== undefined) user.fullName = payload.fullName;
  if (payload.username !== undefined) user.username = payload.username;
  if (payload.phone !== undefined) user.phone = normalizePhone(payload.phone);
  if (payload.roleId !== undefined) user.roleId = payload.roleId;
  if (payload.status !== undefined) user.status = payload.status;

  const saved = await userRepository.save(user);
  return userRepository.toPublicUser(saved);
};

exports.resetPassword = async (id, newPassword, actor) => {
  const user = await userRepository.findById(id);
  if (!user) throw AppError.notFound("User not found");
  if (user.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot reset password for a non-active user");
  }
  if (actor?.id === user.id) {
    throw AppError.badRequest("Use change-password to update your own password");
  }

  const withPassword = await authRepository.findByIdWithPassword(id);
  if (!withPassword) throw AppError.notFound("User not found");

  const same = await withPassword.comparePassword(newPassword);
  if (same) {
    throw AppError.badRequest(
      "New password must be different from the current password",
    );
  }

  await authRepository.updatePassword(withPassword, newPassword);
  return { reset: true };
};

exports.remove = async (id, actor) => {
  const user = await userRepository.findById(id);
  if (!user) throw AppError.notFound("User not found");
  if (actor?.id === user.id) {
    throw AppError.forbidden("You cannot delete your own account");
  }

  await assertNotLastActiveAdmin(user, "INACTIVE", user.roleId);

  try {
    await userRepository.destroy(user);
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      throw AppError.conflict(
        "User has operational history and cannot be deleted; deactivate the account instead",
      );
    }
    throw err;
  }

  return { deleted: true };
};
