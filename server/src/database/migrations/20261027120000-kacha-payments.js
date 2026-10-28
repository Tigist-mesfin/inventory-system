"use strict";

const { DataTypes } = require("sequelize");
const { columns } = require("../schema/columns");

module.exports = {
  async up(queryInterface) {
    const { uuidPk, timestamps, fk, money } = columns(DataTypes);
    const tables = (await queryInterface.showAllTables()).map((t) =>
      String(t).toLowerCase(),
    );

    if (tables.includes("kacha_payments")) return;

    await queryInterface.createTable("kacha_payments", {
      id: uuidPk,
      companyId: fk("companies", { allowNull: true, onDelete: "RESTRICT" }),
      saleId: fk("sales", { onDelete: "RESTRICT" }),
      initiatedBy: fk("users", { onDelete: "RESTRICT" }),
      traceNumber: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      kachaReference: { type: DataTypes.STRING(64), allowNull: true },
      extReference: { type: DataTypes.STRING(64), allowNull: true },
      phone: { type: DataTypes.STRING(32), allowNull: false },
      amount: money(),
      reason: { type: DataTypes.STRING(255), allowNull: true },
      status: {
        type: DataTypes.ENUM(
          "PENDING",
          "PROCESSED",
          "CANCELED",
          "EXPIRED",
          "FAILED",
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },
      appliedAt: { type: DataTypes.DATE, allowNull: true },
      callbackPayload: { type: DataTypes.JSON, allowNull: true },
      requestPayload: { type: DataTypes.JSON, allowNull: true },
      ...timestamps,
    });

    await queryInterface.addIndex("kacha_payments", ["saleId"]);
    await queryInterface.addIndex("kacha_payments", ["companyId"]);
    await queryInterface.addIndex("kacha_payments", ["status"]);
    await queryInterface.addIndex("kacha_payments", ["kachaReference"]);
    await queryInterface.addIndex("kacha_payments", ["extReference"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("kacha_payments");
  },
};
