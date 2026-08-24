const AppError = require("../../shared/errors/AppError");
const {
  signAccessToken,
  signRefreshToken,
} = require("../../shared/helpers/jwt.helper");
const {
  refreshAccessToken,
} = require("../../shared/services/authCore.service");
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
