const { Op } = require("sequelize");
const models = require("../../database/models");
const { userAccessInclude } = require("../../shared/middlewares/auth.middleware");
const { mergedPermissions } = require("../../shared/helpers/tenant.helper");
const phoneNormalize = require("../../shared/helpers/phoneNormalize.helper");

const { User } = models;

const phoneLookupWhere = (rawPhone) => {
  const raw = String(rawPhone || "").trim();
  const phone = phoneNormalize(raw);
  const or = [{ phone: raw }, { username: raw }];
  if (phone && phone !== raw) {
    or.push({ phone }, { username: phone });
  }
  return { [Op.or]: or };
};

exports.findByUsernameWithPassword = async (username) => {
  const raw = String(username || "").trim();
  const phone = phoneNormalize(raw);
  const or = [{ username: raw }, { phone: raw }];
  if (phone && phone !== raw) {
    or.push({ username: phone }, { phone });
  }
  return User.scope("withPassword").findOne({
    where: { [Op.or]: or },
    include: userAccessInclude,
  });
};

exports.findByPhone = async (phone) =>
  User.findOne({
    where: phoneLookupWhere(phone),
    include: userAccessInclude,
  });

exports.findByPhoneWithPassword = async (phone) =>
  User.scope("withPassword").findOne({
    where: phoneLookupWhere(phone),
    include: userAccessInclude,
  });

exports.findPendingByPhone = async (phone) => {
  const normalized = phoneNormalize(phone) || String(phone || "").trim();
  if (!normalized) return null;
  return User.findOne({
    where: {
      status: "PENDING",
      [Op.or]: [{ phone: normalized }, { username: normalized }],
    },
    include: userAccessInclude,
  });
};

exports.findById = async (id) =>
  User.findByPk(id, {
    include: userAccessInclude,
  });

exports.findByIdWithPassword = async (id) =>
  User.scope("withPassword").findByPk(id, {
    include: userAccessInclude,
  });

exports.findByIdWithRoleAndPermissions = async (id) =>
  User.findByPk(id, {
    include: userAccessInclude,
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

exports.activateUser = async (userId) => {
  await User.update(
    { status: "ACTIVE" },
    { where: { id: userId, status: "PENDING" } },
  );
  return exports.findByIdWithRoleAndPermissions(userId);
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

  const permissions = mergedPermissions({
    role: plain.role,
    permissions: plain.permissions,
  })
    .filter((p) => !p.status || p.status === "ACTIVE")
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
    companyId: plain.companyId || null,
    allWarehouses: Boolean(plain.allWarehouses),
    company: plain.company
      ? {
          id: plain.company.id,
          name: plain.company.name,
          phone: plain.company.phone,
          address: plain.company.address,
        }
      : null,
    warehouses: (plain.warehouses || []).map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
    })),
    role,
    permissions,
  };
};
