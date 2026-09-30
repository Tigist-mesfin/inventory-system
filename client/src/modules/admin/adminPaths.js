/** Super-admin route base (obscure login path). */
export const SUPER_ADMIN_BASE = "/admin/dashboard/super";
export const SUPER_ADMIN_LOGIN = `${SUPER_ADMIN_BASE}/login/admin`;
export const SUPER_ADMIN_HOME = SUPER_ADMIN_BASE;

export const superAdminUsername = () =>
  String(import.meta.env.VITE_SUPER_ADMIN_USERNAME || "").trim();

export const superAdminPassword = () =>
  String(import.meta.env.VITE_SUPER_ADMIN_PASSWORD || "").trim();
