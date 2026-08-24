const { verifyAccessToken } = require("../helpers/jwt.helper");
const AppError = require("../errors/AppError");
const catchAsync = require("../helpers/catchAsync.helper");
const models = require("../../database/models");

const PERMISSION_ACTIONS = new Set([
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "EXPORT",
]);

const rolePermissionInclude = {
  model: models.Role,
  as: "role",
  include: [
    {
      model: models.Permission,
      as: "permissions",
      through: { attributes: [] },
      where: { status: "ACTIVE" },
      required: false,
    },
  ],
};

/**
 * Authenticate via httpOnly accessToken cookie.
 * Loads User with active Role and active Permissions for RBAC checks.
 */
const authenticate = catchAsync(async (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) throw AppError.unauthorized("Access token not found");

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized("Invalid or expired token");
  }

  if (decoded.type !== "USER") throw AppError.unauthorized("Invalid token");

  const user = await models.User.findByPk(decoded.id, {
    include: [rolePermissionInclude],
  });

  if (!user || user.status !== "ACTIVE") {
    throw AppError.unauthorized("Invalid token");
  }

  if (!user.role || user.role.status !== "ACTIVE") {
    throw AppError.forbidden("Role is inactive");
  }

  req.user = user;
  next();
});

const normalizeRequired = (args) => {
  if (
    args.length === 2 &&
    typeof args[0] === "string" &&
    typeof args[1] === "string" &&
    !args[0].includes(":") &&
    PERMISSION_ACTIONS.has(args[1])
  ) {
    return [{ module: args[0], action: args[1] }];
  }
  return args;
};

const permissionMatches = (permission, required) => {
  if (typeof required === "string") {
    if (required.includes(":")) {
      return permission.name === required;
    }
    return false;
  }
  if (required && required.module && required.action) {
    return (
      permission.module === required.module &&
      permission.action === required.action
    );
  }
  return false;
};

/**
 * Require permission by:
 *   authorizePermission("inventory", "CREATE")
 *   authorizePermission("sales:CREATE")
 *   authorizePermission({ module: "sales", action: "CREATE" })
 *
 * When multiple requirements are passed (except the module+action pair form),
 * the user needs at least one match.
 */
const authorizePermission =
  (...args) =>
  (req, res, next) => {
    try {
      if (!req.user) throw AppError.unauthorized("Authentication required");
      if (!req.user.role || req.user.role.status !== "ACTIVE") {
        throw AppError.forbidden("Access denied");
      }

      const required = normalizeRequired(args);
      const permissions = (req.user.role.permissions || []).filter(
        (p) => p.status === "ACTIVE",
      );

      const allowed = required.some((reqPerm) =>
        permissions.some((p) => permissionMatches(p, reqPerm)),
      );

      if (!allowed) throw AppError.forbidden("Access denied");
      next();
    } catch (err) {
      next(err);
    }
  };

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.authorizePermission = authorizePermission;
module.exports.rolePermissionInclude = rolePermissionInclude;
