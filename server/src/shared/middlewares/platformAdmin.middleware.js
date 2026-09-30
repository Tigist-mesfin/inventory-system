const AppError = require("../errors/AppError");
const catchAsync = require("../helpers/catchAsync.helper");

const isPlatformAdmin = (user) => user?.role?.name === "ADMIN";

/**
 * Require authenticated platform super-admin (role ADMIN, no company desk).
 */
const authorizePlatformAdmin = catchAsync(async (req, res, next) => {
  if (!req.user) throw AppError.unauthorized("Authentication required");
  if (!isPlatformAdmin(req.user)) {
    throw AppError.forbidden("Platform admin access only");
  }
  return next();
});

module.exports = { authorizePlatformAdmin, isPlatformAdmin };
