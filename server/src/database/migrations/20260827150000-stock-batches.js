"use strict";

const { DataTypes } = require("sequelize");
const { columns } = require("../schema/columns");

module.exports = {
  async up(queryInterface) {
    const { uuidPk, timestamps, fk, money, qty } = columns(DataTypes);
    const tables = (await queryInterface.showAllTables()).map((t) =>
      String(t).toLowerCase(),
    );

    if (!tables.includes("stock_batches")) {
      await queryInterface.createTable("stock_batches", {
        id: uuidPk,
        companyId: fk("companies", { allowNull: true, onDelete: "RESTRICT" }),
        productId: fk("products", { onDelete: "RESTRICT" }),
        warehouseId: fk("warehouses", { onDelete: "RESTRICT" }),
        purchaseOrderId: fk("purchase_orders", {
          allowNull: true,
          onDelete: "SET NULL",
        }),
        purchaseOrderItemId: fk("purchase_order_items", {
          allowNull: true,
          onDelete: "SET NULL",
        }),
        sourceBatchId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        sourceType: {
          type: DataTypes.ENUM("PURCHASE", "TRANSFER", "ADJUSTMENT", "OPENING"),
          allowNull: false,
          defaultValue: "PURCHASE",
        },
        purchaseDate: { type: DataTypes.DATE, allowNull: false },
        unitCost: money(),
        originalQuantity: qty(),
        remainingQuantity: qty({ defaultValue: 0 }),
        ...timestamps,
      });
      await queryInterface.addIndex("stock_batches", ["productId", "warehouseId"]);
      await queryInterface.addIndex("stock_batches", ["purchaseOrderItemId"]);
      await queryInterface.addIndex("stock_batches", ["purchaseDate"]);
    }

    const after = (await queryInterface.showAllTables()).map((t) =>
      String(t).toLowerCase(),
    );
    if (!after.includes("sale_cost_allocations")) {
      await queryInterface.createTable("sale_cost_allocations", {
        id: uuidPk,
        companyId: fk("companies", { allowNull: true, onDelete: "RESTRICT" }),
        saleId: fk("sales", { onDelete: "CASCADE" }),
        saleItemId: fk("sale_items", { onDelete: "CASCADE" }),
        stockBatchId: fk("stock_batches", { onDelete: "RESTRICT" }),
        quantity: qty(),
        unitCost: money(),
        totalCost: money(),
        costingMethod: {
          type: DataTypes.ENUM("SIMPLE", "FIFO", "MANUAL"),
          allowNull: false,
          defaultValue: "SIMPLE",
        },
        ...timestamps,
      });
      await queryInterface.addIndex("sale_cost_allocations", ["saleId"]);
      await queryInterface.addIndex("sale_cost_allocations", ["saleItemId"]);
      await queryInterface.addIndex("sale_cost_allocations", ["stockBatchId"]);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("sale_cost_allocations");
    await queryInterface.dropTable("stock_batches");
  },
};
