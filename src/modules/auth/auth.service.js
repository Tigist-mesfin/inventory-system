const AppError = require("../../shared/errors/AppError");
const {
  signAccessToken,
  signRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
} = require("../../shared/helpers/jwt.helper");
const {
  refreshAccessToken,
} = require("../../shared/services/authCore.service");
const otpService = require("../../shared/services/otp.service");
const models = require("../../database/models");
const phoneNormalize = require("../../shared/helpers/phoneNormalize.helper");
const sequelize = require("../../config/db");
const { Op } = require("sequelize");
const authRepository = require("./auth.repository");

const ACTOR_TYPE = "USER";
const { OTP_PURPOSES } = otpService;

const isLoginEligible = (user) =>
  Boolean(user) &&
  user.status === "ACTIVE" &&
  user.role &&
  user.role.status === "ACTIVE";

const roleClaim = (user) => user.role?.name || null;

const normalizePhone = (raw) => {
  const phone = phoneNormalize(raw) || String(raw || "").trim();
  if (!phone) {
    throw AppError.badRequest("Enter a valid phone number", "OTP_PHONE_INVALID");
  }
  return phone;
};

const issueSession = async (user) => {
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

const ensureOwnerRole = async () => {
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
  return ownerRole;
};

exports.login = async ({ username, password }) => {
  const user = await authRepository.findByUsernameWithPassword(username);

  if (!user) {
    throw AppError.unauthorized("Invalid credentials");
  }

  if (user.status === "PENDING") {
    throw AppError.unauthorized(
      "Verify your phone to activate your account",
      "ACCOUNT_PENDING",
    );
  }

  if (user.status === "INACTIVE" || user.status === "SUSPENDED") {
    throw AppError.unauthorized("Invalid credentials");
  }

  if (!user.role || user.role.status !== "ACTIVE") {
    throw AppError.unauthorized("Invalid credentials");
  }

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    throw AppError.unauthorized("Invalid credentials");
  }

  return issueSession(user);
};

/**
 * Create company + PENDING owner, then send REGISTRATION OTP.
 * Does not issue auth tokens until OTP verification.
 */
exports.registerCompany = async (payload) => {
  const phone = normalizePhone(payload.phone);

  const takenUser = await models.User.unscoped().findOne({
    where: { [Op.or]: [{ username: phone }, { phone }] },
  });
  if (takenUser) {
    if (takenUser.status === "PENDING") {
      throw AppError.conflict(
        "This phone is pending verification. Resend or verify the OTP.",
        "ACCOUNT_PENDING",
      );
    }
    throw AppError.conflict("This phone is already registered");
  }

  const takenCompany = await models.Company.findOne({ where: { phone } });
  if (takenCompany) throw AppError.conflict("This phone is already registered");

  const ownerRole = await ensureOwnerRole();

  const userId = await sequelize.transaction(async (transaction) => {
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
        status: "PENDING",
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
      ["CBE", "TELEBIRR", "ABYSSINIA BANK "].map((name) => ({
        name,
        status: "ACTIVE",
        companyId: company.id,
      })),
      { transaction },
    );
    await models.Warehouse.create(
      {
        name: "Main store",
        code: `MAIN-${String(company.id).replace(/-/g, "").slice(0, 8).toUpperCase()}`,
        companyId: company.id,
        status: "ACTIVE",
      },
      { transaction },
    );
    return user.id;
  });

  const otpResult = await otpService.sendOtp({
    userId,
    phone,
    purpose: OTP_PURPOSES.REGISTRATION,
  });

  return {
    phone: otpResult.phone,
    purpose: otpResult.purpose,
    expiresAt: otpResult.expiresAt,
    status: "PENDING",
  };
};

exports.verifyRegistrationOtp = async ({ phone, otp }) => {
  const normalizedPhone = normalizePhone(phone);
  const user = await authRepository.findPendingByPhone(normalizedPhone);
  if (!user) {
    throw AppError.notFound(
      "No pending registration found for this phone",
      "USER_NOT_FOUND",
    );
  }

  await otpService.verifyOtp({
    userId: user.id,
    phone: normalizedPhone,
    purpose: OTP_PURPOSES.REGISTRATION,
    code: otp,
  });

  const activated = await authRepository.activateUser(user.id);
  if (!activated || activated.status !== "ACTIVE") {
    throw AppError.badRequest(
      "Unable to activate account",
      "ACCOUNT_ACTIVATION_FAILED",
    );
  }

  return issueSession(activated);
};

exports.resendRegistrationOtp = async ({ phone }) => {
  const normalizedPhone = normalizePhone(phone);
  const user = await authRepository.findPendingByPhone(normalizedPhone);
  if (!user) {
    throw AppError.notFound(
      "No pending registration found for this phone",
      "USER_NOT_FOUND",
    );
  }

  const otpResult = await otpService.sendOtp({
    userId: user.id,
    phone: normalizedPhone,
    purpose: OTP_PURPOSES.REGISTRATION,
  });

  return {
    phone: otpResult.phone,
    purpose: otpResult.purpose,
    expiresAt: otpResult.expiresAt,
    status: "PENDING",
  };
};

exports.requestLoginOtp = async ({ phone }) => {
  const normalizedPhone = normalizePhone(phone);
  const user = await authRepository.findByPhone(normalizedPhone);

  if (!user) {
    throw AppError.notFound("User not found", "USER_NOT_FOUND");
  }
  if (user.status === "PENDING") {
    throw AppError.unauthorized(
      "Verify your phone to activate your account",
      "ACCOUNT_PENDING",
    );
  }
  if (user.status !== "ACTIVE" || !user.role || user.role.status !== "ACTIVE") {
    throw AppError.unauthorized("Account is not active", "ACCOUNT_INACTIVE");
  }

  const otpResult = await otpService.sendOtp({
    userId: user.id,
    phone: normalizedPhone,
    purpose: OTP_PURPOSES.LOGIN,
  });

  return {
    phone: otpResult.phone,
    purpose: otpResult.purpose,
    expiresAt: otpResult.expiresAt,
  };
};

exports.verifyLoginOtp = async ({ phone, otp }) => {
  const normalizedPhone = normalizePhone(phone);
  const user = await authRepository.findByPhone(normalizedPhone);

  if (!user) {
    throw AppError.notFound("User not found", "USER_NOT_FOUND");
  }
  if (user.status !== "ACTIVE" || !user.role || user.role.status !== "ACTIVE") {
    throw AppError.unauthorized("Account is not active", "ACCOUNT_INACTIVE");
  }

  await otpService.verifyOtp({
    userId: user.id,
    phone: normalizedPhone,
    purpose: OTP_PURPOSES.LOGIN,
    code: otp,
  });

  return issueSession(user);
};

exports.forgotPassword = async ({ phone }) => {
  const normalizedPhone = normalizePhone(phone);
  const user = await authRepository.findByPhone(normalizedPhone);

  if (!user) {
    throw AppError.notFound("User not found", "USER_NOT_FOUND");
  }
  if (user.status === "PENDING") {
    throw AppError.unauthorized(
      "Verify your phone to activate your account",
      "ACCOUNT_PENDING",
    );
  }
  if (user.status !== "ACTIVE") {
    throw AppError.unauthorized("Account is not active", "ACCOUNT_INACTIVE");
  }

  const otpResult = await otpService.sendOtp({
    userId: user.id,
    phone: normalizedPhone,
    purpose: OTP_PURPOSES.PASSWORD_RESET,
  });

  return {
    phone: otpResult.phone,
    purpose: otpResult.purpose,
    expiresAt: otpResult.expiresAt,
  };
};

exports.verifyPasswordResetOtp = async ({ phone, otp }) => {
  const normalizedPhone = normalizePhone(phone);
  const user = await authRepository.findByPhone(normalizedPhone);

  if (!user) {
    throw AppError.notFound("User not found", "USER_NOT_FOUND");
  }
  if (user.status !== "ACTIVE") {
    throw AppError.unauthorized("Account is not active", "ACCOUNT_INACTIVE");
  }

  await otpService.verifyOtp({
    userId: user.id,
    phone: normalizedPhone,
    purpose: OTP_PURPOSES.PASSWORD_RESET,
    code: otp,
  });

  const resetToken = signPasswordResetToken({ id: user.id });
  return { resetToken, phone: normalizedPhone };
};

exports.resetPassword = async ({ resetToken, newPassword }) => {
  if (!resetToken) {
    throw AppError.badRequest("Reset token is required", "RESET_TOKEN_REQUIRED");
  }

  let decoded;
  try {
    decoded = verifyPasswordResetToken(resetToken);
  } catch {
    throw AppError.unauthorized(
      "Invalid or expired reset token",
      "RESET_TOKEN_INVALID",
    );
  }

  const user = await authRepository.findByIdWithPassword(decoded.id);
  if (!user || user.status !== "ACTIVE") {
    throw AppError.notFound("User not found", "USER_NOT_FOUND");
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
