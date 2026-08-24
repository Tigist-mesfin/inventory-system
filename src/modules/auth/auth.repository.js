const models = require("../../database/models");
const { rolePermissionInclude } = require("../../shared/middlewares/auth.middleware");

const { User } = models;

const activeRolePermissionsInclude = [
  {
    ...rolePermissionInclude,
    where: { status: "ACTIVE" },
    required: false,
  },
];

exports.findByUsernameWithPassword = async (username) =>
  User.scope("withPassword").findOne({
    where: { username },
    include: activeRolePermissionsInclude,
  });

exports.findById = async (id) =>
  User.findByPk(id, {
    include: activeRolePermissionsInclude,
  });

exports.findByIdWithPassword = async (id) =>
  User.scope("withPassword").findByPk(id, {
    include: activeRolePermissionsInclude,
  });

exports.findByIdWithRoleAndPermissions = async (id) =>
  User.findByPk(id, {
    include: activeRolePermissionsInclude,
  });

exports.updateLastLoginAt = async (userId, date = new Date()) => {
  await User.update(
    { lastLoginAt: date },
    { where: { id: userId }, validate: false },
  );
};

exports.updatePassword = async (user, newPassword) => {
  user.password = newPassword;
  await user.save();
  return user;
};

exports.toPublicUser = (user) => {
  if (!user) return null;

  const plain = typeof user.toJSON === "function" ? user.toJSON() : { ...user };
  delete plain.password;

  const role = plain.role
    ? {
        id: plain.role.id,
        name: plain.role.name,
        description: plain.role.description,
        status: plain.role.status,
      }
    : null;

  const permissions = (plain.role?.permissions || [])
    .filter((p) => p.status === "ACTIVE")
    .map((p) => ({
      id: p.id,
      name: p.name,
      module: p.module,
      action: p.action,
      status: p.status,
    }));

  return {
    id: plain.id,
    fullName: plain.fullName,
    username: plain.username,
    phone: plain.phone,
    status: plain.status,
    lastLoginAt: plain.lastLoginAt,
    role,
    permissions,
  };
};
