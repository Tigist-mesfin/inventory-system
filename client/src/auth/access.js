export const OWNER_ROLES = new Set(["ADMIN", "COMPANY_OWNER"]);

/** Platform super-admin (seeded ADMIN role) — uses /admin/dashboard/super desk. */
export function isPlatformAdmin(user) {
  return user?.role?.name === "ADMIN";
}

export function isOwner(user) {
  if (isPlatformAdmin(user)) return false;
  return user?.role?.name === "COMPANY_OWNER";
}

export function isSalesman(user) {
  return user?.role?.name === "SALESMAN";
}

function permissionList(user) {
  return Array.isArray(user?.permissions) ? user.permissions : [];
}

export function can(user, moduleName, action) {
  if (!user) return false;
  if (isOwner(user)) return true;
  const wantName = `${moduleName}:${action}`;
  return permissionList(user).some((permission) => {
    if (!permission) return false;
    if (permission.module === moduleName && permission.action === action) return true;
    if (permission.name === wantName) return true;
    return false;
  });
}

export function canAny(user, pairs) {
  return pairs.some(([moduleName, action]) => can(user, moduleName, action));
}

export function hasAnyModuleAccess(user) {
  if (!user) return false;
  if (isOwner(user)) return true;
  return permissionList(user).some(
    (permission) => permission?.action === "READ" || permission?.name?.endsWith(":READ"),
  );
}

/** First desk route the user is allowed to open. */
export function firstAllowedPath(user) {
  if (!user) return "/login";
  if (isOwner(user)) return "/";
  const candidates = [
    ["/", null, null],
    ["/sell", "sales", "READ"],
    ["/orders", "sales", "READ"],
    ["/buy", "purchasing", "READ"],
    ["/stock", "inventory", "READ"],
    ["/customers", "customers", "READ"],
    ["/catalog", "catalog", "READ"],
    ["/warehouses", "warehouse", "READ"],
    ["/expenses", "finance", "READ"],
    ["/reports", "insights", "READ"],
  ];
  for (const [path, moduleName, action] of candidates) {
    if (!moduleName) {
      if (hasAnyModuleAccess(user)) return path;
      continue;
    }
    if (can(user, moduleName, action)) return path;
  }
  return "/more";
}
