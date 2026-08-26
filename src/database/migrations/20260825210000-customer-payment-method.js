"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize
      .query("ALTER TABLE customer_payments MODIFY method VARCHAR(64) NOT NULL")
      .catch(() => {});
  },

  async down() {},
};
