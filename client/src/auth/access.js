export const OWNER_ROLES = new Set(["ADMIN", "COMPANY_OWNER"]);

export function isOwner(user) {
  return OWNER_ROLES.has(user?.role?.name);
}

export function can(user, moduleName, action) {
  if (!user) return false;
  if (isOwner(user)) return true;
  return (user.permissions || []).some(
    (permission) => permission.module === moduleName && permission.action === action,
  );
}

export function canAny(user, pairs) {
  return pairs.some(([moduleName, action]) => can(user, moduleName, action));
}
