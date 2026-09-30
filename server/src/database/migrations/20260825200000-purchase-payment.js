"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
  async up(queryInterface) {
    const desc = await queryInterface.describeTable("purchase_orders");
    if (!desc.paymentMethod) {
      await queryInterface.addColumn("purchase_orders", "paymentMethod", {
        type: DataTypes.STRING(64),
        allowNull: true,
      });
    }

    await queryInterface.sequelize
      .query("ALTER TABLE supplier_payments MODIFY method VARCHAR(64) NOT NULL")
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("purchase_orders", "paymentMethod").catch(() => {});
  },
};
