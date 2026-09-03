"use strict";

const { DataTypes } = require("sequelize");

const addMobileSyncColumns = async (queryInterface, tableName) => {
  const desc = await queryInterface.describeTable(tableName);

  if (!desc.clientTransactionId) {
    await queryInterface.addColumn(tableName, "clientTransactionId", {
      type: DataTypes.UUID,
      allowNull: true,
    });
  }

  if (!desc.sourceMode) {
    await queryInterface.addColumn(tableName, "sourceMode", {
      type: DataTypes.ENUM("ONLINE", "OFFLINE"),
      allowNull: false,
      defaultValue: "ONLINE",
    });
  }

  await queryInterface
    .addIndex(tableName, ["companyId", "clientTransactionId"], {
      unique: true,
      name: `${tableName}_client_tx_company_unique`,
    })
    .catch(() => {});
};

module.exports = {
  async up(queryInterface) {
    await addMobileSyncColumns(queryInterface, "purchase_orders");
    await addMobileSyncColumns(queryInterface, "sales");
  },

  async down(queryInterface) {
    await queryInterface
      .removeIndex("purchase_orders", "purchase_orders_client_tx_company_unique")
      .catch(() => {});
    await queryInterface
      .removeIndex("sales", "sales_client_tx_company_unique")
      .catch(() => {});
    await queryInterface.removeColumn("purchase_orders", "clientTransactionId").catch(() => {});
    await queryInterface.removeColumn("purchase_orders", "sourceMode").catch(() => {});
    await queryInterface.removeColumn("sales", "clientTransactionId").catch(() => {});
    await queryInterface.removeColumn("sales", "sourceMode").catch(() => {});
  },
};
