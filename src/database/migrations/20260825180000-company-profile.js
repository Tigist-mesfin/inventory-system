"use strict";

const { DataTypes } = require("sequelize");
const { randomUUID } = require("crypto");
const { columns } = require("../schema/columns");

module.exports = {
  async up(queryInterface) {
    const { uuidPk, timestamps } = columns(DataTypes);
    const tables = (await queryInterface.showAllTables()).map((t) =>
      String(t).toLowerCase(),
    );
    if (!tables.includes("company_profiles")) {
      await queryInterface.createTable("company_profiles", {
        id: uuidPk,
        name: { type: DataTypes.STRING, allowNull: true },
        address: { type: DataTypes.STRING, allowNull: true },
        phone: { type: DataTypes.STRING, allowNull: true },
        email: { type: DataTypes.STRING, allowNull: true },
        tin: { type: DataTypes.STRING, allowNull: true },
        ...timestamps,
      });
      const now = new Date();
      await queryInterface.bulkInsert("company_profiles", [
        {
          id: randomUUID(),
          name: null,
          address: null,
          phone: null,
          email: null,
          tin: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("company_profiles");
  },
};
