const { Op } = require("sequelize");
const AppError = require("../errors/AppError");

const OWNER_ROLES = new Set(["ADMIN", "COMPANY_OWNER"]);
const MISSING_COMPANY = "00000000-0000-0000-0000-000000000000";

const companyIdOf = (user) => user?.companyId || null;

const requireCompanyId = (user) => {
  const companyId = companyIdOf(user);
  if (!companyId) {
    throw AppError.forbidden("This account is not linked to a company");
  }
  return companyId;
};

const isOwner = (user) => OWNER_ROLES.has(user?.role?.name);

const warehouseIdsOf = (user) => {
  if (!user) return [];
  if (isOwner(user) || user.allWarehouses) return null;
  return (user.warehouses || []).map((row) => row.id).filter(Boolean);
};

const applyCompany = (where, user) => {
  where.companyId = companyIdOf(user) || MISSING_COMPANY;
  return where;
};

const applyWarehouse = (where, user, field = "warehouseId") => {
  const ids = warehouseIdsOf(user);
  if (ids) {
    if (!ids.length) where[field] = null;
    else where[field] = ids.length === 1 ? ids[0] : { [Op.in]: ids };
  }
  return where;
};

const applyTenant = (where, user) => {
  applyCompany(where, user);
  applyWarehouse(where, user);
  return where;
};

const applyTransferWarehouses = (where, user) => {
  applyCompany(where, user);
  const ids = warehouseIdsOf(user);
  if (!ids) return where;
  const idFilter = ids.length ? { [Op.in]: ids } : null;
  where[Op.or] = [
    { sourceWarehouseId: idFilter },
    { destinationWarehouseId: idFilter },
  ];
  return where;
};

const assertWarehouseAccess = (user, warehouseId) => {
  if (!warehouseId) return;
  const ids = warehouseIdsOf(user);
  if (ids) {
    if (!ids.length || !ids.includes(warehouseId)) {
      throw AppError.forbidden("No access to this store");
    }
  }
};

const assertOwned = (user, record, message = "Not found") => {
  if (!record) throw AppError.notFound(message);
  const companyId = companyIdOf(user);
  if (!companyId || !record.companyId || record.companyId !== companyId) {
    throw AppError.notFound(message);
  }
  return record;
};

const mergedPermissions = (user) => {
  const fromRole = user?.role?.permissions || [];
  const fromUser = user?.permissions || [];
  const map = new Map();
  for (const permission of [...fromRole, ...fromUser]) {
    if (permission?.status && permission.status !== "ACTIVE") continue;
    const key = permission.name || `${permission.module}:${permission.action}`;
    map.set(key, permission);
  }
  return [...map.values()];
};

const hasPermission = (user, moduleName, action) => {
  if (isOwner(user)) return true;
  // Salesmen are limited to direct user permissions only (assigned in Team).
  if (user?.role?.name === "SALESMAN") {
    return (user.permissions || []).some(
      (permission) =>
        (permission.module === moduleName && permission.action === action) ||
        permission.name === `${moduleName}:${action}`,
    );
  }
  return mergedPermissions(user).some(
    (permission) =>
      permission.module === moduleName && permission.action === action,
  );
};

module.exports = {
  companyIdOf,
  requireCompanyId,
  isOwner,
  warehouseIdsOf,
  applyCompany,
  applyWarehouse,
  applyTenant,
  applyTransferWarehouses,
  assertWarehouseAccess,
  assertOwned,
  mergedPermissions,
  hasPermission,
};
