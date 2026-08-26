"use strict";

const { DataTypes } = require("sequelize");
const wholesale = require("../schema/08-wholesale");

module.exports = {
  async up(queryInterface) {
    await wholesale.up(queryInterface, DataTypes);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "stock_transfer_items",
      "stock_transfer_items_transfer_product_unique",
    ).catch(() => {});

    await queryInterface.removeColumn("purchase_orders", "paidAmount").catch(() => {});
    await queryInterface.removeColumn("purchase_orders", "dueDate").catch(() => {});
    await queryInterface.removeColumn("sales", "paidAmount").catch(() => {});
    await queryInterface.removeColumn("sales", "dueDate").catch(() => {});
    await queryInterface.removeColumn("sales", "customerId").catch(() => {});

    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS=0");
    for (const table of wholesale.downTables) {
      await queryInterface.dropTable(table);
    }
    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS=1");

    await queryInterface.removeIndex("products", ["color"]).catch(() => {});
    await queryInterface.removeIndex("products", ["size"]).catch(() => {});
    await queryInterface.removeIndex("products", ["brand"]).catch(() => {});
    await queryInterface.removeColumn("products", "color").catch(() => {});
    await queryInterface.removeColumn("products", "size").catch(() => {});
    await queryInterface.removeColumn("products", "brand").catch(() => {});
  },
};
