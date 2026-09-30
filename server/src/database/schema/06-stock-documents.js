"use strict";

const { columns } = require("./columns");

exports.up = async (queryInterface, DataTypes) => {
  const { uuidPk, timestamps, fk, money, qty } = columns(DataTypes);

  await queryInterface.createTable("stock_adjustments", {
    id: uuidPk,
    warehouseId: fk("warehouses", { onDelete: "RESTRICT" }),
    createdBy: fk("users", { onDelete: "RESTRICT" }),
    adjustmentNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    reason: { type: DataTypes.TEXT, allowNull: false },
    adjustmentDate: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.ENUM("DRAFT", "COMPLETED", "CANCELLED"),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("stock_adjustments", ["warehouseId"]);
  await queryInterface.addIndex("stock_adjustments", ["createdBy"]);
  await queryInterface.addIndex("stock_adjustments", ["status"]);
  await queryInterface.addIndex("stock_adjustments", ["adjustmentDate"]);

  await queryInterface.createTable("stock_adjustment_items", {
    id: uuidPk,
    stockAdjustmentId: fk("stock_adjustments", { onDelete: "CASCADE" }),
    productId: fk("products", { onDelete: "RESTRICT" }),
    systemQuantity: qty(),
    actualQuantity: qty(),
    difference: qty(),
    reason: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex(
    "stock_adjustment_items",
    ["stockAdjustmentId", "productId"],
    { unique: true, name: "stock_adjustment_items_adj_product_unique" },
  );
  await queryInterface.addIndex("stock_adjustment_items", ["productId"]);

  await queryInterface.createTable("stock_transfers", {
    id: uuidPk,
    sourceWarehouseId: fk("warehouses", { onDelete: "RESTRICT" }),
    destinationWarehouseId: fk("warehouses", { onDelete: "RESTRICT" }),
    createdBy: fk("users", { onDelete: "RESTRICT" }),
    transferNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    transferDate: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "DRAFT",
        "REQUESTED",
        "APPROVED",
        "IN_TRANSIT",
        "COMPLETED",
        "CANCELLED",
      ),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("stock_transfers", ["sourceWarehouseId"]);
  await queryInterface.addIndex("stock_transfers", ["destinationWarehouseId"]);
  await queryInterface.addIndex("stock_transfers", ["createdBy"]);
  await queryInterface.addIndex("stock_transfers", ["status"]);
  await queryInterface.addIndex("stock_transfers", ["transferDate"]);

  await queryInterface.createTable("stock_transfer_items", {
    id: uuidPk,
    stockTransferId: fk("stock_transfers", { onDelete: "CASCADE" }),
    productId: fk("products", { onDelete: "RESTRICT" }),
    quantity: qty(),
    receivedQuantity: qty({ defaultValue: 0 }),
    ...timestamps,
  });
  await queryInterface.addIndex("stock_transfer_items", ["stockTransferId"]);
  await queryInterface.addIndex("stock_transfer_items", ["productId"]);

  await queryInterface.createTable("stock_transactions", {
    id: uuidPk,
    productId: fk("products", { onDelete: "RESTRICT" }),
    warehouseId: fk("warehouses", { onDelete: "RESTRICT" }),
    createdBy: fk("users", { onDelete: "RESTRICT" }),
    type: {
      type: DataTypes.ENUM(
        "PURCHASE",
        "SALE",
        "SALE_RETURN",
        "PURCHASE_RETURN",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "ADJUSTMENT_IN",
        "ADJUSTMENT_OUT",
      ),
      allowNull: false,
    },
    quantity: qty(),
    quantityBefore: qty(),
    quantityAfter: qty(),
    unitCost: money({ allowNull: true }),
    referenceType: { type: DataTypes.STRING, allowNull: true },
    referenceId: { type: DataTypes.UUID, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("stock_transactions", [
    "productId",
    "warehouseId",
  ]);
  await queryInterface.addIndex("stock_transactions", [
    "referenceType",
    "referenceId",
  ]);
  await queryInterface.addIndex("stock_transactions", ["type"]);
  await queryInterface.addIndex("stock_transactions", ["createdBy"]);
  await queryInterface.addIndex("stock_transactions", ["createdAt"]);
  await queryInterface.addIndex(
    "stock_transactions",
    ["referenceType", "referenceId", "type", "productId", "warehouseId"],
    { unique: true, name: "stock_transactions_idempotency_unique" },
  );
};

exports.downTables = [
  "stock_transactions",
  "stock_transfer_items",
  "stock_transfers",
  "stock_adjustment_items",
  "stock_adjustments",
];
