"use strict";

const { DataTypes } = require("sequelize");
const { columns } = require("../schema/columns");

module.exports = {
  async up(queryInterface) {
    const { uuidPk, timestamps, fk, money } = columns(DataTypes);
    const tables = (await queryInterface.showAllTables()).map((t) =>
      String(t).toLowerCase(),
    );
    if (tables.includes("expenses")) return;

    await queryInterface.createTable("expenses", {
      id: uuidPk,
      companyId: fk("companies", { onDelete: "RESTRICT" }),
      createdBy: fk("users", { onDelete: "RESTRICT" }),
      expenseDate: { type: DataTypes.DATE, allowNull: false },
      category: { type: DataTypes.STRING(32), allowNull: false },
      description: { type: DataTypes.STRING(256), allowNull: false },
      amount: money(),
      paymentMethod: { type: DataTypes.STRING(64), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      ...timestamps,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("expenses");
  },
};
