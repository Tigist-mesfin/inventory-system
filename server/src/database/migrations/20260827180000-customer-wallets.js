"use strict";

const { DataTypes } = require("sequelize");
const { columns } = require("../schema/columns");

module.exports = {
  async up(queryInterface) {
    const { uuidPk, timestamps, fk, money } = columns(DataTypes);
    const tables = (await queryInterface.showAllTables()).map((t) =>
      String(t).toLowerCase(),
    );
    const describe = async (table) => {
      try {
        return await queryInterface.describeTable(table);
      } catch {
        return {};
      }
    };

    if (tables.includes("customers")) {
      const cols = await describe("customers");
      if (!cols.walletBalance) {
        await queryInterface.addColumn("customers", "walletBalance", {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
        });
      }
    }

    if (!tables.includes("customer_wallet_transactions")) {
      await queryInterface.createTable("customer_wallet_transactions", {
        id: uuidPk,
        companyId: fk("companies", { allowNull: true, onDelete: "RESTRICT" }),
        customerId: fk("customers", { onDelete: "RESTRICT" }),
        saleId: fk("sales", { allowNull: true, onDelete: "RESTRICT" }),
        recordedBy: fk("users", { onDelete: "RESTRICT" }),
        type: {
          type: DataTypes.ENUM("DEPOSIT", "SALE", "REFUND"),
          allowNull: false,
        },
        amount: money(),
        method: { type: DataTypes.STRING(64), allowNull: false },
        reason: { type: DataTypes.STRING(500), allowNull: true },
        occurredAt: { type: DataTypes.DATE, allowNull: false },
        ...timestamps,
      });
      await queryInterface.addIndex("customer_wallet_transactions", ["customerId"]);
      await queryInterface.addIndex("customer_wallet_transactions", ["saleId"]);
      await queryInterface.addIndex("customer_wallet_transactions", ["occurredAt"]);
      await queryInterface.addIndex("customer_wallet_transactions", ["type"]);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("customer_wallet_transactions");
    const cols = await queryInterface.describeTable("customers").catch(() => ({}));
    if (cols.walletBalance) {
      await queryInterface.removeColumn("customers", "walletBalance");
    }
  },
};
