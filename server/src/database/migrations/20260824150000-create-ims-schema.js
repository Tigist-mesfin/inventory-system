"use strict";

const { DataTypes } = require("sequelize");

const steps = [
  require("../schema/01-auth"),
  require("../schema/02-catalog"),
  require("../schema/03-warehouse-inventory"),
  require("../schema/04-purchasing"),
  require("../schema/05-sales"),
  require("../schema/06-stock-documents"),
  require("../schema/07-audit"),
];

module.exports = {
  async up(queryInterface) {
    for (const step of steps) {
      await step.up(queryInterface, DataTypes);
    }
  },

  async down(queryInterface) {
    const tables = steps
      .slice()
      .reverse()
      .flatMap((step) => step.downTables);

    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS=0");
    for (const table of tables) {
      await queryInterface.dropTable(table);
    }
    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS=1");
  },
};
