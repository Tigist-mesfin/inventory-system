const { verifyAccessToken } = require("../helpers/jwt.helper");
const AppError = require("../errors/AppError");
const catchAsync = require("../helpers/catchAsync.helper");
const models = require("../../database/models");
const { mergedPermissions, isOwner } = require("../helpers/tenant.helper");

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

const userAccessInclude = [
  rolePermissionInclude,
  {
    model: models.Permission,
    as: "permissions",
    through: { attributes: [] },
    required: false,
  },
  {
    model: models.Warehouse,
    as: "warehouses",
    through: { attributes: [] },
    required: false,
    attributes: ["id", "name", "code"],
  },
  {
    model: models.Company,
    as: "company",
    required: false,
    attributes: ["id", "name", "phone", "address"],
  },
];

/**
 * Authenticate via httpOnly accessToken cookie.
 * Loads User with active Role and active Permissions for RBAC checks.
 */
const readAccessToken = (req) => {
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  const header = req.headers?.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  // Mobile + cPanel/Apache fallback when Authorization header is stripped.
  const xToken = req.headers["x-access-token"];
  if (typeof xToken === "string" && xToken.trim()) {
    return xToken.trim();
  }
  return null;
};

const authenticate = catchAsync(async (req, res, next) => {
  const token = readAccessToken(req);
  if (!token) throw AppError.unauthorized("Access token not found");

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized("Invalid or expired token");
  }

  if (decoded.type !== "USER") throw AppError.unauthorized("Invalid token");

  const user = await models.User.findByPk(decoded.id, {
    include: userAccessInclude,
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

      if (isOwner(req.user)) return next();

      const required = normalizeRequired(args);
      // Salesmen: only UserPermission rows (not role catalog grants).
      const permissions =
        req.user?.role?.name === "SALESMAN"
          ? (req.user.permissions || []).filter(
              (p) => !p.status || p.status === "ACTIVE",
            )
          : mergedPermissions(req.user).filter(
              (p) => !p.status || p.status === "ACTIVE",
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

/** Company owner / admin only (not salesman permissions). */
const authorizeOwner = () => (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthorized("Authentication required");
    if (!isOwner(req.user)) {
      throw AppError.forbidden("Only the company account can do this");
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.authorizePermission = authorizePermission;
module.exports.authorizeOwner = authorizeOwner;
module.exports.rolePermissionInclude = rolePermissionInclude;
module.exports.userAccessInclude = userAccessInclude;
