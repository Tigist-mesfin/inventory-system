"use strict";

const { DataTypes } = require("sequelize");
const { columns } = require("../schema/columns");

module.exports = {
  async up(queryInterface) {
    const { uuidPk, fk } = columns(DataTypes);
    const tables = (await queryInterface.showAllTables()).map((t) =>
      String(t).toLowerCase(),
    );
    if (tables.includes("otps")) return;

    await queryInterface.createTable("otps", {
      id: uuidPk,
      userId: fk("users", { allowNull: true, onDelete: "CASCADE" }),
      phone: { type: DataTypes.STRING, allowNull: false },
      otp: { type: DataTypes.STRING(4), allowNull: false },
      purpose: {
        type: DataTypes.ENUM("REGISTRATION", "PASSWORD_RESET", "LOGIN"),
        allowNull: false,
      },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      attemptCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex("otps", ["userId"]);
    await queryInterface.addIndex("otps", ["phone"]);
    await queryInterface.addIndex("otps", ["purpose"]);
    await queryInterface.addIndex("otps", ["phone", "purpose", "used"]);
    await queryInterface.addIndex("otps", ["expiresAt"]);
    await queryInterface.addIndex("otps", ["createdAt"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("otps");
  },
};
