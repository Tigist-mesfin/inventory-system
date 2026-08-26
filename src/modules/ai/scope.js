const tenant = require("../../shared/helpers/tenant.helper");
const AppError = require("../../shared/errors/AppError");

exports.scope = (user, filters = {}) => {
  const companyId = tenant.requireCompanyId(user);
  if (filters.warehouseId) {
    tenant.assertWarehouseAccess(user, filters.warehouseId);
  }
  let warehouseIds = tenant.warehouseIdsOf(user);
  if (filters.warehouseId) {
    warehouseIds = [filters.warehouseId];
  }
  return {
    companyId,
    warehouseIds,
    allWarehouses: warehouseIds === null,
    userId: user.id,
    isOwner: tenant.isOwner(user),
  };
};

exports.assertCompanyWide = (scope, message) => {
  if (!scope.allWarehouses) {
    throw AppError.forbidden(
      message || "This question needs access to every store",
    );
  }
};

exports.meta = (range, extra = {}) => ({
  period: range.label,
  from: range.fromKey,
  to: range.toKey,
  lastUpdated: new Date().toISOString(),
  costingMethod: "weighted_average",
  ...extra,
});
