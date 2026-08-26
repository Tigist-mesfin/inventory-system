"use strict";

const { DataTypes } = require("sequelize");
const { columns } = require("../schema/columns");

const TABLES = [
  "categories",
  "inventory",
  "stock_transactions",
  "stock_adjustments",
  "stock_transfers",
  "stock_receipts",
  "customer_orders",
  "customer_payments",
  "supplier_payments",
  "payment_methods",
  "company_profiles",
  "price_histories",
  "customer_prices",
  "audit_logs",
];

const dropUniqueOn = async (queryInterface, table, fieldNames) => {
  let indexes = [];
  try {
    indexes = await queryInterface.showIndex(table);
  } catch {
    return;
  }
  const wanted = new Set(fieldNames);
  for (const index of indexes) {
    if (!index.unique) continue;
    const fields = (index.fields || []).map((f) => f.attribute || f.name);
    if (fields.length === wanted.size && fields.every((name) => wanted.has(name))) {
      if (index.primary) continue;
      await queryInterface.removeIndex(table, index.name).catch(() => {});
    }
  }
};

module.exports = {
  async up(queryInterface) {
    const { fk } = columns(DataTypes);
    const tables = (await queryInterface.showAllTables()).map((t) =>
      String(t).toLowerCase(),
    );
    const has = (name) => tables.includes(name);

    const [companies] = await queryInterface.sequelize.query(
      "SELECT id FROM companies LIMIT 1",
    );
    const defaultCompanyId = companies[0]?.id || null;

    const addCompanyCol = async (table) => {
      if (!has(table)) return;
      const desc = await queryInterface.describeTable(table);
      if (desc.companyId) return;
      await queryInterface.addColumn(table, "companyId", {
        ...fk("companies", { allowNull: true, onDelete: "RESTRICT" }),
      });
      if (defaultCompanyId) {
        await queryInterface.sequelize.query(
          `UPDATE \`${table}\` SET companyId = :companyId WHERE companyId IS NULL`,
          { replacements: { companyId: defaultCompanyId } },
        );
      }
    };

    for (const table of TABLES) {
      await addCompanyCol(table);
    }

    const q = queryInterface.sequelize;
    if (has("inventory") && has("warehouses")) {
      await q.query(`
        UPDATE inventory i
        INNER JOIN warehouses w ON w.id = i.warehouseId
        SET i.companyId = w.companyId
        WHERE w.companyId IS NOT NULL
      `);
    }
    if (has("stock_transactions") && has("warehouses")) {
      await q.query(`
        UPDATE stock_transactions st
        INNER JOIN warehouses w ON w.id = st.warehouseId
        SET st.companyId = w.companyId
        WHERE w.companyId IS NOT NULL
      `);
    }
    if (has("stock_adjustments") && has("warehouses")) {
      await q.query(`
        UPDATE stock_adjustments sa
        INNER JOIN warehouses w ON w.id = sa.warehouseId
        SET sa.companyId = w.companyId
        WHERE w.companyId IS NOT NULL
      `);
    }
    if (has("stock_transfers") && has("warehouses")) {
      await q.query(`
        UPDATE stock_transfers st
        INNER JOIN warehouses w ON w.id = st.sourceWarehouseId
        SET st.companyId = w.companyId
        WHERE w.companyId IS NOT NULL
      `);
    }
    if (has("stock_receipts") && has("warehouses")) {
      await q.query(`
        UPDATE stock_receipts sr
        INNER JOIN warehouses w ON w.id = sr.warehouseId
        SET sr.companyId = w.companyId
        WHERE w.companyId IS NOT NULL
      `);
    }
    if (has("customer_orders") && has("warehouses")) {
      await q.query(`
        UPDATE customer_orders co
        INNER JOIN warehouses w ON w.id = co.warehouseId
        SET co.companyId = w.companyId
        WHERE w.companyId IS NOT NULL
      `);
    }
    if (has("customer_payments") && has("customers")) {
      await q.query(`
        UPDATE customer_payments cp
        INNER JOIN customers c ON c.id = cp.customerId
        SET cp.companyId = c.companyId
        WHERE c.companyId IS NOT NULL
      `);
    }
    if (has("supplier_payments") && has("suppliers")) {
      await q.query(`
        UPDATE supplier_payments sp
        INNER JOIN suppliers s ON s.id = sp.supplierId
        SET sp.companyId = s.companyId
        WHERE s.companyId IS NOT NULL
      `);
    }
    if (has("price_histories") && has("products")) {
      await q.query(`
        UPDATE price_histories ph
        INNER JOIN products p ON p.id = ph.productId
        SET ph.companyId = p.companyId
        WHERE p.companyId IS NOT NULL
      `);
    }
    if (has("customer_prices") && has("customers")) {
      await q.query(`
        UPDATE customer_prices cp
        INNER JOIN customers c ON c.id = cp.customerId
        SET cp.companyId = c.companyId
        WHERE c.companyId IS NOT NULL
      `);
    }
    if (has("audit_logs") && has("users")) {
      await q.query(`
        UPDATE audit_logs al
        INNER JOIN users u ON u.id = al.userId
        SET al.companyId = u.companyId
        WHERE u.companyId IS NOT NULL
      `);
    }
    if (has("categories") && has("products")) {
      await q.query(`
        UPDATE categories c
        INNER JOIN products p ON p.categoryId = c.id
        SET c.companyId = p.companyId
        WHERE p.companyId IS NOT NULL AND c.companyId IS NULL
      `);
    }

    await dropUniqueOn(queryInterface, "warehouses", ["name"]);
    await dropUniqueOn(queryInterface, "warehouses", ["code"]);
    await dropUniqueOn(queryInterface, "categories", ["name"]);
    await dropUniqueOn(queryInterface, "payment_methods", ["name"]);
    await dropUniqueOn(queryInterface, "products", ["sku"]);
    await dropUniqueOn(queryInterface, "products", ["barcode"]);
  },

  async down() {},
};
