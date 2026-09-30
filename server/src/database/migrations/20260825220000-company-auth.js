"use strict";

const { DataTypes } = require("sequelize");
const { randomUUID } = require("crypto");
const { columns } = require("../schema/columns");

module.exports = {
  async up(queryInterface) {
    const { uuidPk, timestamps, fk } = columns(DataTypes);
    const tables = (await queryInterface.showAllTables()).map((t) =>
      String(t).toLowerCase(),
    );
    const has = (name) => tables.includes(name);

    if (!has("companies")) {
      await queryInterface.createTable("companies", {
        id: uuidPk,
        name: { type: DataTypes.STRING, allowNull: false },
        phone: { type: DataTypes.STRING, allowNull: false },
        address: { type: DataTypes.STRING, allowNull: true },
        status: {
          type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
        ...timestamps,
      });
    }

    const now = new Date();
    const [companies] = await queryInterface.sequelize.query(
      "SELECT id FROM companies LIMIT 1",
    );
    let companyId = companies[0]?.id;
    if (!companyId) {
      companyId = randomUUID();
      await queryInterface.bulkInsert("companies", [
        {
          id: companyId,
          name: "Default company",
          phone: "0000000000",
          address: null,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }

    const addCompanyCol = async (table) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc.companyId) {
        await queryInterface.addColumn(table, "companyId", {
          ...fk("companies", { allowNull: true, onDelete: "RESTRICT" }),
        });
        await queryInterface.sequelize.query(
          `UPDATE \`${table}\` SET companyId = :companyId WHERE companyId IS NULL`,
          { replacements: { companyId } },
        );
      }
    };

    await addCompanyCol("users");
    await addCompanyCol("warehouses");
    await addCompanyCol("products");
    await addCompanyCol("customers");
    await addCompanyCol("suppliers");
    await addCompanyCol("sales");
    await addCompanyCol("purchase_orders");

    const users = await queryInterface.describeTable("users");
    if (!users.allWarehouses) {
      await queryInterface.addColumn("users", "allWarehouses", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    if (!has("user_warehouses")) {
      await queryInterface.createTable("user_warehouses", {
        id: uuidPk,
        userId: fk("users", { onDelete: "CASCADE" }),
        warehouseId: fk("warehouses", { onDelete: "CASCADE" }),
        ...timestamps,
      });
    }

    if (!has("user_permissions")) {
      await queryInterface.createTable("user_permissions", {
        id: uuidPk,
        userId: fk("users", { onDelete: "CASCADE" }),
        permissionId: fk("permissions", { onDelete: "CASCADE" }),
        ...timestamps,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_permissions").catch(() => {});
    await queryInterface.dropTable("user_warehouses").catch(() => {});
  },
};
