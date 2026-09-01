"use strict";

const { DataTypes } = require("sequelize");
const { columns } = require("../schema/columns");

module.exports = {
  async up(queryInterface) {
    const { uuidPk, timestamps, fk, money } = columns(DataTypes);
    const tables = (await queryInterface.showAllTables()).map((t) =>
      String(t).toLowerCase(),
    );
    if (tables.includes("other_incomes")) return;

    await queryInterface.createTable("other_incomes", {
      id: uuidPk,
      companyId: fk("companies", { onDelete: "RESTRICT" }),
      createdBy: fk("users", { onDelete: "RESTRICT" }),
      incomeDate: { type: DataTypes.DATE, allowNull: false },
      receivedFrom: { type: DataTypes.STRING(128), allowNull: false },
      reason: { type: DataTypes.STRING(256), allowNull: false },
      amount: money(),
      paymentMethod: { type: DataTypes.STRING(64), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      ...timestamps,
    });

    await queryInterface.addIndex("other_incomes", ["companyId", "incomeDate"], {
      name: "other_incomes_company_date_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("other_incomes");
  },
};
