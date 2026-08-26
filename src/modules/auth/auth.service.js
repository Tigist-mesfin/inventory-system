const AppError = require("../../shared/errors/AppError");
const {
  signAccessToken,
  signRefreshToken,
} = require("../../shared/helpers/jwt.helper");
const {
  refreshAccessToken,
} = require("../../shared/services/authCore.service");
const models = require("../../database/models");
const phoneNormalize = require("../../shared/helpers/phoneNormalize.helper");
const sequelize = require("../../config/db");
const { Op } = require("sequelize");
const authRepository = require("./auth.repository");

const ACTOR_TYPE = "USER";

const isLoginEligible = (user) =>
  Boolean(user) &&
  user.status === "ACTIVE" &&
  user.role &&
  user.role.status === "ACTIVE";

const roleClaim = (user) => user.role?.name || null;

exports.login = async ({ username, password }) => {
  const user = await authRepository.findByUsernameWithPassword(username);

  if (!user || user.status === "INACTIVE" || user.status === "SUSPENDED") {
    throw AppError.unauthorized("Invalid credentials");
  }

  if (!user.role || user.role.status !== "ACTIVE") {
    throw AppError.unauthorized("Invalid credentials");
  }

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    throw AppError.unauthorized("Invalid credentials");
  }

  const accessToken = signAccessToken({
    id: user.id,
    role: roleClaim(user),
    type: ACTOR_TYPE,
  });
  const refreshToken = signRefreshToken({
    id: user.id,
    type: ACTOR_TYPE,
  });

  await authRepository.updateLastLoginAt(user.id);

  const publicUser = authRepository.toPublicUser(user);
  publicUser.lastLoginAt = new Date();

  return {
    user: publicUser,
    accessToken,
    refreshToken,
  };
};

exports.registerCompany = async (payload) => {
  const phone = phoneNormalize(payload.phone) || String(payload.phone || "").trim();
  if (!phone) throw AppError.badRequest("Enter a valid phone number");

  const takenUser = await models.User.unscoped().findOne({
    where: { [Op.or]: [{ username: phone }, { phone }] },
  });
  if (takenUser) throw AppError.conflict("This phone is already registered");

  const takenCompany = await models.Company.findOne({ where: { phone } });
  if (takenCompany) throw AppError.conflict("This phone is already registered");

  let ownerRole = await models.Role.findOne({ where: { name: "COMPANY_OWNER" } });
  if (!ownerRole) {
    ownerRole = await models.Role.create({
      name: "COMPANY_OWNER",
      description: "Company owner with full access",
      status: "ACTIVE",
    });
    const permissions = await models.Permission.findAll({ where: { status: "ACTIVE" } });
    await models.RolePermission.bulkCreate(
      permissions.map((permission) => ({
        roleId: ownerRole.id,
        permissionId: permission.id,
      })),
    );
  }

  const result = await sequelize.transaction(async (transaction) => {
    const company = await models.Company.create(
      {
        name: payload.name,
        phone,
        address: payload.address || null,
        status: "ACTIVE",
      },
      { transaction },
    );
    const user = await models.User.create(
      {
        fullName: payload.name,
        username: phone,
        phone,
        password: payload.password,
        roleId: ownerRole.id,
        companyId: company.id,
        allWarehouses: true,
        status: "ACTIVE",
      },
      { transaction },
    );
    await models.CompanyProfile.create(
      {
        companyId: company.id,
        name: payload.name,
        phone,
        address: payload.address || null,
      },
      { transaction },
    );
    await models.PaymentMethod.bulkCreate(
      ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY", "CREDIT"].map((name) => ({
        name,
        status: "ACTIVE",
        companyId: company.id,
      })),
      { transaction },
    );
    return user.id;
  });

  const user = await authRepository.findByIdWithRoleAndPermissions(result);
  const accessToken = signAccessToken({
    id: user.id,
    role: roleClaim(user),
    type: ACTOR_TYPE,
  });
  const refreshToken = signRefreshToken({
    id: user.id,
    type: ACTOR_TYPE,
  });
  return {
    user: authRepository.toPublicUser(user),
    accessToken,
    refreshToken,
  };
};

exports.refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw AppError.unauthorized("Refresh token not found");
  }

  const { accessToken } = await refreshAccessToken({
    token: refreshToken,
    type: ACTOR_TYPE,
    findById: authRepository.findById,
    isActive: isLoginEligible,
    role: (record) => roleClaim(record),
  });

  return { accessToken };
};

exports.me = async (userId) => {
  const user = await authRepository.findByIdWithRoleAndPermissions(userId);
  if (!user || user.status !== "ACTIVE") {
    throw AppError.unauthorized("Invalid token");
  }
  if (!user.role || user.role.status !== "ACTIVE") {
    throw AppError.forbidden("Role is inactive");
  }
  return authRepository.toPublicUser(user);
};

exports.changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await authRepository.findByIdWithPassword(userId);
  if (!user || user.status !== "ACTIVE") {
    throw AppError.unauthorized("Invalid token");
  }

  const currentOk = await user.comparePassword(currentPassword);
  if (!currentOk) {
    throw AppError.unauthorized("Current password is incorrect");
  }

  const sameAsCurrent = await user.comparePassword(newPassword);
  if (sameAsCurrent) {
    throw AppError.badRequest(
      "New password must be different from the current password",
    );
  }

  await authRepository.updatePassword(user, newPassword);
  return { changed: true };
};
