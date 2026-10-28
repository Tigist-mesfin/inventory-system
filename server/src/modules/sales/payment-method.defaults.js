const { Op } = require("sequelize");
const models = require("../../database/models");
const tenant = require("../../shared/helpers/tenant.helper");

/** System-wide defaults shared by every company (companyId = null). */
const DEFAULT_PAYMENT_METHOD_NAMES = [
  "CBE",
  "Telebirr",
  "Kacha",
  "Abyssinia Bank",
  "Dashen Bank",
  "Cooperative Bank of Oromia",
  "Abay Bank",
  "Wegagen Bank",
  "Oromia International Bank",
  "Cash Payment",
  "Check Payment",
  "Debit Payment",
];

const normalizeName = (name) => String(name || "").trim().replace(/\s+/g, " ");

const nameKey = (name) => normalizeName(name).toLowerCase();

/** Scope: company-owned rows + global defaults. */
const paymentMethodWhere = (user, extra = {}) => {
  const companyId = tenant.companyIdOf(user);
  const where = { ...extra };
  if (companyId) {
    where[Op.or] = [{ companyId }, { companyId: null }];
  } else {
    where.companyId = null;
  }
  return where;
};

/**
 * Prefer company-specific rows when the same name exists as a global default.
 */
const dedupePaymentMethods = (rows) => {
  const map = new Map();
  for (const row of rows || []) {
    const plain = typeof row.toJSON === "function" ? row.toJSON() : row;
    const key = nameKey(plain.name);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, plain);
      continue;
    }
    if (plain.companyId && !existing.companyId) {
      map.set(key, plain);
    }
  }
  return [...map.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }),
  );
};

const toPublicPaymentMethod = (row) => {
  const plain = typeof row.toJSON === "function" ? row.toJSON() : row;
  return {
    id: plain.id,
    name: plain.name,
    status: plain.status,
    isDefault: !plain.companyId,
    companyId: plain.companyId || null,
    createdAt: plain.createdAt,
  };
};

/**
 * Ensure global default payment methods exist (idempotent).
 */
const ensureDefaultPaymentMethods = async () => {
  const { PaymentMethod } = models;
  for (const name of DEFAULT_PAYMENT_METHOD_NAMES) {
    const existing = await PaymentMethod.findOne({
      where: {
        companyId: null,
        name: { [Op.like]: name },
      },
    });
    if (existing) continue;

    // Also skip if a case-variant global already exists
    const globals = await PaymentMethod.findAll({ where: { companyId: null } });
    if (globals.some((row) => nameKey(row.name) === nameKey(name))) continue;

    await PaymentMethod.create({
      name,
      status: "ACTIVE",
      companyId: null,
    });
  }
};

module.exports = {
  DEFAULT_PAYMENT_METHOD_NAMES,
  normalizeName,
  nameKey,
  paymentMethodWhere,
  dedupePaymentMethods,
  toPublicPaymentMethod,
  ensureDefaultPaymentMethods,
};
