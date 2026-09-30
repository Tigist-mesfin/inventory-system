const crypto = require("crypto");
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

const randomPassword = () => crypto.randomBytes(24).toString("base64url");

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

const ensureOwnerRole = async (transaction) => {
  let ownerRole = await models.Role.findOne({
    where: { name: "COMPANY_OWNER" },
    transaction,
  });
  if (!ownerRole) {
    ownerRole = await models.Role.create(
      {
        name: "COMPANY_OWNER",
        description: "Company owner with full access",
        status: "ACTIVE",
      },
      { transaction },
    );
    const permissions = await models.Permission.findAll({
      where: { status: "ACTIVE" },
      transaction,
    });
    await models.RolePermission.bulkCreate(
      permissions.map((permission) => ({
        roleId: ownerRole.id,
        permissionId: permission.id,
      })),
      { transaction },
    );
  }
  return ownerRole;
};

/**
 * Create company + COMPANY_OWNER user (+ profile, payment methods, main warehouse).
 * @returns {Promise<string>} new user id
 */
const provisionCompanyOwner = async ({
  phone,
  name,
  address = null,
  password,
  status = "ACTIVE",
  transaction,
}) => {
  const ownerRole = await ensureOwnerRole(transaction);
  const company = await models.Company.create(
    {
      name,
      phone,
      address: address || null,
      status: "ACTIVE",
    },
    { transaction },
  );
  const user = await models.User.create(
    {
      fullName: name,
      username: phone,
      phone,
      password,
      roleId: ownerRole.id,
      companyId: company.id,
      allWarehouses: true,
      status,
    },
    { transaction },
  );
  await models.CompanyProfile.create(
    {
      companyId: company.id,
      name,
      phone,
      address: address || null,
    },
    { transaction },
  );
  // Default payment methods are global (companyId null) — shared by all companies.
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

  const userId = await sequelize.transaction(async (transaction) =>
    provisionCompanyOwner({
      phone,
      name: payload.name,
      address: payload.address || null,
      password: payload.password,
      status: "PENDING",
      transaction,
    }),
  );

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

/**
 * Request a LOGIN OTP for any phone.
 * - Existing ACTIVE / PENDING users: OTP bound to userId
 * - Unregistered phones: OTP stored with userId=null; verify will auto-create account
 */
exports.requestLoginOtp = async ({ phone }) => {
  const normalizedPhone = normalizePhone(phone);
  const user = await authRepository.findByPhone(normalizedPhone);

  if (user) {
    if (user.status === "INACTIVE" || user.status === "SUSPENDED") {
      throw AppError.unauthorized("Account is not active", "ACCOUNT_INACTIVE");
    }
    if (
      user.status !== "ACTIVE" &&
      user.status !== "PENDING"
    ) {
      throw AppError.unauthorized("Account is not active", "ACCOUNT_INACTIVE");
    }
    if (!user.role || user.role.status !== "ACTIVE") {
      throw AppError.unauthorized("Account is not active", "ACCOUNT_INACTIVE");
    }
  }

  const otpResult = await otpService.sendOtp({
    userId: user?.id || null,
    phone: normalizedPhone,
    purpose: OTP_PURPOSES.LOGIN,
  });

  return {
    phone: otpResult.phone,
    purpose: otpResult.purpose,
    expiresAt: otpResult.expiresAt,
    isNewUser: !user,
  };
};

/**
 * Verify LOGIN OTP and issue a session.
 * Unregistered phones are provisioned as a new COMPANY_OWNER on first successful verify.
 * PENDING users are activated.
 */
exports.verifyLoginOtp = async ({ phone, otp }) => {
  const normalizedPhone = normalizePhone(phone);
  let user = await authRepository.findByPhone(normalizedPhone);

  if (user) {
    if (user.status === "INACTIVE" || user.status === "SUSPENDED") {
      throw AppError.unauthorized("Account is not active", "ACCOUNT_INACTIVE");
    }
    if (!user.role || user.role.status !== "ACTIVE") {
      throw AppError.unauthorized("Account is not active", "ACCOUNT_INACTIVE");
    }
  }

  await otpService.verifyOtp({
    userId: user?.id || null,
    phone: normalizedPhone,
    purpose: OTP_PURPOSES.LOGIN,
    code: otp,
  });

  if (!user) {
    const takenCompany = await models.Company.findOne({
      where: { phone: normalizedPhone },
    });
    if (takenCompany) {
      throw AppError.conflict(
        "This phone is already linked to a company",
        "COMPANY_PHONE_TAKEN",
      );
    }

    const userId = await sequelize.transaction(async (transaction) =>
      provisionCompanyOwner({
        phone: normalizedPhone,
        name: `Company ${normalizedPhone}`,
        password: randomPassword(),
        status: "ACTIVE",
        transaction,
      }),
    );
    user = await authRepository.findByIdWithRoleAndPermissions(userId);
    if (!user || !isLoginEligible(user)) {
      throw AppError.badRequest(
        "Unable to create account",
        "ACCOUNT_PROVISION_FAILED",
      );
    }
    return issueSession(user);
  }

  if (user.status === "PENDING") {
    const activated = await authRepository.activateUser(user.id);
    if (!activated || activated.status !== "ACTIVE") {
      throw AppError.badRequest(
        "Unable to activate account",
        "ACCOUNT_ACTIVATION_FAILED",
      );
    }
    return issueSession(activated);
  }

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

  // Password recovery may intentionally set the SMS OTP as the password.
  await authRepository.updatePassword(user, newPassword);

  const sessionUser =
    (await authRepository.findByIdWithRoleAndPermissions(user.id)) || user;
  return issueSession(sessionUser);
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

const OWNER_ROLE_NAMES = new Set(["COMPANY_OWNER", "ADMIN"]);

const countActiveOwnersInCompany = async (companyId, excludeUserId, transaction) => {
  if (!companyId) return 0;
  const owners = await models.User.findAll({
    where: {
      companyId,
      status: "ACTIVE",
      ...(excludeUserId ? { id: { [Op.ne]: excludeUserId } } : {}),
    },
    include: [
      {
        model: models.Role,
        as: "role",
        attributes: ["id", "name"],
        required: true,
      },
    ],
    transaction,
  });
  return owners.filter((row) => OWNER_ROLE_NAMES.has(row.role?.name)).length;
};

const countOtherActiveUsersInCompany = async (
  companyId,
  excludeUserId,
  transaction,
) => {
  if (!companyId) return 0;
  return models.User.count({
    where: {
      companyId,
      status: "ACTIVE",
      id: { [Op.ne]: excludeUserId },
    },
    transaction,
  });
};

/**
 * App Store Guideline 5.1.1(v) — permanently delete / anonymize the signed-in user.
 * Never deletes another account. Preserves company inventory and operational history.
 */
exports.deleteAccount = async (userId, { password }) => {
  const user = await authRepository.findByIdWithPassword(userId);
  if (!user || user.status !== "ACTIVE") {
    throw AppError.unauthorized("Invalid token");
  }

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    throw AppError.unauthorized(
      "Password is incorrect",
      "ACCOUNT_DELETE_AUTH_FAILED",
    );
  }

  const roleName = user.role?.name || null;
  const isCompanyOwner = OWNER_ROLE_NAMES.has(roleName);
  const companyId = user.companyId || null;

  return sequelize.transaction(async (transaction) => {
    if (isCompanyOwner && companyId) {
      const remainingOwners = await countActiveOwnersInCompany(
        companyId,
        user.id,
        transaction,
      );
      const otherUsers = await countOtherActiveUsersInCompany(
        companyId,
        user.id,
        transaction,
      );

      if (remainingOwners < 1 && otherUsers > 0) {
        throw AppError.conflict(
          "You are the only company owner with active team members. Promote another owner or remove team members before deleting your account.",
          "ACCOUNT_DELETE_SOLE_OWNER",
        );
      }
    }

    const tombstone = `deleted_${String(user.id).replace(/-/g, "").slice(0, 24)}`;

    if (models.UserPermission) {
      await models.UserPermission.destroy({
        where: { userId: user.id },
        transaction,
      });
    }
    if (models.UserWarehouse) {
      await models.UserWarehouse.destroy({
        where: { userId: user.id },
        transaction,
      });
    }
    if (models.Otp) {
      await models.Otp.destroy({
        where: { userId: user.id },
        transaction,
      });
    }

    // Anonymize PII and revoke login. Keep the row so RESTRICT FKs on sales/etc. remain valid.
    user.fullName = "Deleted User";
    user.username = tombstone;
    user.phone = tombstone;
    user.password = randomPassword();
    user.status = "INACTIVE";
    user.allWarehouses = false;
    user.lastLoginAt = null;
    await user.save({ transaction });

    let companyClosed = false;
    if (isCompanyOwner && companyId) {
      const remainingOwners = await countActiveOwnersInCompany(
        companyId,
        user.id,
        transaction,
      );
      const otherUsers = await countOtherActiveUsersInCompany(
        companyId,
        user.id,
        transaction,
      );
      if (remainingOwners < 1 && otherUsers < 1) {
        await models.Company.update(
          { status: "INACTIVE" },
          { where: { id: companyId }, transaction },
        );
        companyClosed = true;
      }
    }

    if (models.AuditLog) {
      try {
        await models.AuditLog.create(
          {
            userId: null,
            companyId,
            action: "DELETE",
            entityType: "User",
            entityId: user.id,
            oldValues: { role: roleName },
            newValues: { status: "INACTIVE", anonymized: true, companyClosed },
            description:
              "Personal account data anonymized per user request (App Store 5.1.1(v))",
          },
          { transaction },
        );
      } catch (_) {
        // Audit is best-effort; deletion must still succeed.
      }
    }

    return {
      deleted: true,
      companyClosed,
      message: companyClosed
        ? "Your account was deleted and the company workspace was closed. Business records are retained for legal purposes without your personal login details."
        : "Your account was permanently deleted. Company inventory and records belonging to the business were not removed.",
    };
  });
};
