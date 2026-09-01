const models = require("../models");
const { User, Role, Permission, RolePermission, DocumentSequence } = models;
const env = require("../../config/env");
const phoneNormalize = require("../../shared/helpers/phoneNormalize.helper");

const DEFAULT_SEQUENCES = [
  { documentType: "PURCHASE_ORDER", prefix: "PO", lastValue: 0, padLength: 6 },
  { documentType: "STOCK_RECEIPT", prefix: "RC", lastValue: 0, padLength: 6 },
  { documentType: "SALE", prefix: "INV", lastValue: 0, padLength: 6 },
  { documentType: "STOCK_TRANSFER", prefix: "TR", lastValue: 0, padLength: 6 },
  { documentType: "STOCK_ADJUSTMENT", prefix: "ADJ", lastValue: 0, padLength: 6 },
  { documentType: "CUSTOMER_ORDER", prefix: "ORD", lastValue: 0, padLength: 6 },
];

const PERMISSION_ACTIONS = [
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "EXPORT",
];

const PERMISSION_MODULES = [
  {
    module: "auth",
    description: "Authentication and account administration",
  },
  {
    module: "catalog",
    description: "Categories, products, and suppliers",
  },
  {
    module: "warehouse",
    description: "Warehouse management",
  },
  {
    module: "inventory",
    description: "Inventory balances and stock documents",
  },
  {
    module: "purchasing",
    description: "Purchase orders and stock receipts",
  },
  {
    module: "sales",
    description: "Sales and invoices",
  },
  {
    module: "customers",
    description: "Customer records, credit, and special prices",
  },
  {
    module: "insights",
    description: "Dashboards, follow-ups, and marketplace search",
  },
  {
    module: "finance",
    description: "Expenses and income statement",
  },
  {
    module: "audit",
    description: "Audit log access",
  },
];

async function seedDocumentSequences() {
  for (const seq of DEFAULT_SEQUENCES) {
    const existing = await DocumentSequence.findOne({
      where: { documentType: seq.documentType },
    });
    if (!existing) {
      await DocumentSequence.create(seq);
    }
  }
}

async function ensureAdminRole() {
  let role = await Role.findOne({ where: { name: "ADMIN" } });
  if (!role) {
    role = await Role.create({
      name: "ADMIN",
      description: "System administrator with full permissions",
      status: "ACTIVE",
    });
    console.log("✅ Admin role seeded");
  }
  return role;
}

async function seedPermissionCatalog() {
  const permissions = [];

  for (const entry of PERMISSION_MODULES) {
    for (const action of PERMISSION_ACTIONS) {
      const name = `${entry.module}:${action}`;
      let permission = await Permission.findOne({
        where: { module: entry.module, action },
      });

      if (!permission) {
        permission = await Permission.create({
          name,
          module: entry.module,
          action,
          description: `${action} access for ${entry.module} (${entry.description})`,
          status: "ACTIVE",
        });
      }

      permissions.push(permission);
    }
  }

  return permissions;
}

async function assignAllPermissionsToRole(role, permissions) {
  for (const permission of permissions) {
    const existing = await RolePermission.findOne({
      where: { roleId: role.id, permissionId: permission.id },
    });
    if (!existing) {
      await RolePermission.create({
        roleId: role.id,
        permissionId: permission.id,
      });
    }
  }
}

async function seedAdminUser(role) {
  const { ADMIN_SEED_USERNAME, ADMIN_SEED_PASSWORD } = env;
  if (!ADMIN_SEED_USERNAME || !ADMIN_SEED_PASSWORD) {
    console.warn(
      "⚠️ Skipping admin user seed: ADMIN_SEED_USERNAME / ADMIN_SEED_PASSWORD not set",
    );
    return;
  }

  const phone = phoneNormalize(env.ADMIN_SEED_PHONE) || env.ADMIN_SEED_PHONE;
  if (!phone) {
    console.warn(
      "⚠️ Skipping admin user seed: ADMIN_SEED_PHONE is missing or invalid",
    );
    return;
  }

  const exists = await User.unscoped().findOne({
    where: { username: ADMIN_SEED_USERNAME },
  });
  if (exists) return;

  await User.create({
    fullName: env.ADMIN_SEED_FULLNAME || "Super Admin",
    username: ADMIN_SEED_USERNAME,
    phone,
    password: ADMIN_SEED_PASSWORD,
    roleId: role.id,
    allWarehouses: true,
    status: "ACTIVE",
  });
  console.log(`✅ Admin seeded: ${ADMIN_SEED_USERNAME}`);
}

module.exports = async () => {
  await seedDocumentSequences();

  const role = await ensureAdminRole();
  const permissions = await seedPermissionCatalog();
  await assignAllPermissionsToRole(role, permissions);

  let ownerRole = await Role.findOne({ where: { name: "COMPANY_OWNER" } });
  if (!ownerRole) {
    ownerRole = await Role.create({
      name: "COMPANY_OWNER",
      description: "Company owner with full access",
      status: "ACTIVE",
    });
  }
  await assignAllPermissionsToRole(ownerRole, permissions);

  let salesmanRole = await Role.findOne({ where: { name: "SALESMAN" } });
  if (!salesmanRole) {
    await Role.create({
      name: "SALESMAN",
      description: "Store salesman with assigned module and store access",
      status: "ACTIVE",
    });
  }

  console.log(
    `✅ Permission catalog ready (${permissions.length} permissions assigned to ADMIN and COMPANY_OWNER)`,
  );

  await seedAdminUser(role);
  await require("./seedDemo")();
  await seedPaymentMethods();
};

async function seedPaymentMethods() {
  const { PaymentMethod, Company } = models;
  const names = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY", "CREDIT"];
  const companies = await Company.findAll();
  for (const company of companies) {
    for (const name of names) {
      const existing = await PaymentMethod.findOne({
        where: { name, companyId: company.id },
      });
      if (!existing) {
        await PaymentMethod.create({
          name,
          status: "ACTIVE",
          companyId: company.id,
        });
      }
    }
  }
}
