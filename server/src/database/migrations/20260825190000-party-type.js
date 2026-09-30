"use strict";

const { DataTypes } = require("sequelize");
const { randomUUID } = require("crypto");
const { columns } = require("../schema/columns");

module.exports = {
  async up(queryInterface) {
    const { fk } = columns(DataTypes);
    const desc = await queryInterface.describeTable("customers");

    if (!desc.type) {
      await queryInterface.addColumn("customers", "type", {
        type: DataTypes.ENUM("CUSTOMER", "SUPPLIER"),
        allowNull: false,
        defaultValue: "CUSTOMER",
      });
      await queryInterface.addIndex("customers", ["type"]).catch(() => {});
    }

    if (!desc.supplierId) {
      await queryInterface.addColumn("customers", "supplierId", {
        ...fk("suppliers", { allowNull: true, onDelete: "SET NULL" }),
      });
      await queryInterface.addIndex("customers", ["supplierId"], { unique: true }).catch(() => {});
    }

    const [users] = await queryInterface.sequelize.query(
      "SELECT id FROM users ORDER BY createdAt ASC LIMIT 1",
    );
    const createdBy = users[0]?.id;
    if (!createdBy) return;

    const [suppliers] = await queryInterface.sequelize.query(
      "SELECT id, name, phone FROM suppliers",
    );
    const [linked] = await queryInterface.sequelize.query(
      "SELECT supplierId FROM customers WHERE supplierId IS NOT NULL",
    );
    const have = new Set(linked.map((row) => row.supplierId));
    const now = new Date();

    for (const supplier of suppliers) {
      if (have.has(supplier.id)) continue;
      await queryInterface.bulkInsert("customers", [
        {
          id: randomUUID(),
          createdBy,
          name: supplier.name,
          phone: supplier.phone || "0000000",
          businessName: null,
          location: null,
          creditLimit: 0,
          notes: null,
          status: "ACTIVE",
          type: "SUPPLIER",
          supplierId: supplier.id,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("customers", ["supplierId"]).catch(() => {});
    await queryInterface.removeColumn("customers", "supplierId").catch(() => {});
    await queryInterface.removeIndex("customers", ["type"]).catch(() => {});
    await queryInterface.removeColumn("customers", "type").catch(() => {});
  },
};
