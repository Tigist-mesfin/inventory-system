"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable("purchase_order_items");

    if (!table.deliveryStatus) {
      await queryInterface.addColumn("purchase_order_items", "deliveryStatus", {
        type: DataTypes.ENUM("NOT_DELIVERED", "ON_LOADING", "DELIVERED"),
        allowNull: false,
        defaultValue: "NOT_DELIVERED",
      });
    }

    if (!table.warehouseId) {
      await queryInterface.addColumn("purchase_order_items", "warehouseId", {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "warehouses", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      });
    }

    await queryInterface.addIndex("purchase_order_items", ["deliveryStatus"], {
      name: "purchase_order_items_delivery_status",
    }).catch(() => {});
    await queryInterface.addIndex("purchase_order_items", ["warehouseId"], {
      name: "purchase_order_items_warehouse_id",
    }).catch(() => {});

    await queryInterface.sequelize.query(`
      UPDATE purchase_order_items poi
      INNER JOIN stock_receipt_items sri ON sri.purchaseOrderItemId = poi.id
      INNER JOIN stock_receipts sr
        ON sr.id = sri.stockReceiptId AND sr.status = 'COMPLETED'
      SET
        poi.deliveryStatus = 'DELIVERED',
        poi.warehouseId = sr.warehouseId
      WHERE poi.receivedQuantity > 0
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "purchase_order_items",
      "purchase_order_items_delivery_status",
    ).catch(() => {});
    await queryInterface.removeIndex(
      "purchase_order_items",
      "purchase_order_items_warehouse_id",
    ).catch(() => {});
    await queryInterface.removeColumn("purchase_order_items", "warehouseId").catch(() => {});
    await queryInterface.removeColumn("purchase_order_items", "deliveryStatus").catch(() => {});
  },
};
