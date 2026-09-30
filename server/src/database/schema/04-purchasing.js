"use strict";

const { columns } = require("./columns");

exports.up = async (queryInterface, DataTypes) => {
  const { uuidPk, timestamps, fk, money, qty } = columns(DataTypes);

  await queryInterface.createTable("purchase_orders", {
    id: uuidPk,
    supplierId: fk("suppliers", { onDelete: "RESTRICT" }),
    createdBy: fk("users", { onDelete: "RESTRICT" }),
    orderNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
    orderDate: { type: DataTypes.DATE, allowNull: false },
    expectedDate: { type: DataTypes.DATE, allowNull: true },
    subtotal: money({ defaultValue: 0 }),
    taxAmount: money({ defaultValue: 0 }),
    discountAmount: money({ defaultValue: 0 }),
    totalAmount: money({ defaultValue: 0 }),
    status: {
      type: DataTypes.ENUM(
        "DRAFT",
        "SUBMITTED",
        "APPROVED",
        "PARTIALLY_RECEIVED",
        "COMPLETED",
        "CANCELLED",
      ),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("purchase_orders", ["supplierId"]);
  await queryInterface.addIndex("purchase_orders", ["createdBy"]);
  await queryInterface.addIndex("purchase_orders", ["status"]);
  await queryInterface.addIndex("purchase_orders", ["orderDate"]);

  await queryInterface.createTable("purchase_order_items", {
    id: uuidPk,
    purchaseOrderId: fk("purchase_orders", { onDelete: "CASCADE" }),
    productId: fk("products", { onDelete: "RESTRICT" }),
    quantity: qty(),
    receivedQuantity: qty({ defaultValue: 0 }),
    unitPrice: money(),
    totalPrice: money({ defaultValue: 0 }),
    ...timestamps,
  });
  await queryInterface.addIndex(
    "purchase_order_items",
    ["purchaseOrderId", "productId"],
    { unique: true, name: "purchase_order_items_po_product_unique" },
  );
  await queryInterface.addIndex("purchase_order_items", ["productId"]);

  await queryInterface.createTable("stock_receipts", {
    id: uuidPk,
    purchaseOrderId: fk("purchase_orders", {
      allowNull: true,
      onDelete: "RESTRICT",
    }),
    warehouseId: fk("warehouses", { onDelete: "RESTRICT" }),
    receivedBy: fk("users", { onDelete: "RESTRICT" }),
    receiptNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
    receiptDate: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.ENUM("DRAFT", "COMPLETED", "CANCELLED"),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("stock_receipts", ["purchaseOrderId"]);
  await queryInterface.addIndex("stock_receipts", ["warehouseId"]);
  await queryInterface.addIndex("stock_receipts", ["receivedBy"]);
  await queryInterface.addIndex("stock_receipts", ["status"]);
  await queryInterface.addIndex("stock_receipts", ["receiptDate"]);

  await queryInterface.createTable("stock_receipt_items", {
    id: uuidPk,
    stockReceiptId: fk("stock_receipts", { onDelete: "CASCADE" }),
    purchaseOrderItemId: fk("purchase_order_items", {
      allowNull: true,
      onDelete: "RESTRICT",
    }),
    productId: fk("products", { onDelete: "RESTRICT" }),
    quantity: qty(),
    unitCost: money(),
    batchNumber: { type: DataTypes.STRING, allowNull: true },
    expiryDate: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("stock_receipt_items", ["stockReceiptId"]);
  await queryInterface.addIndex("stock_receipt_items", ["purchaseOrderItemId"]);
  await queryInterface.addIndex("stock_receipt_items", ["productId"]);
};

exports.downTables = [
  "stock_receipt_items",
  "stock_receipts",
  "purchase_order_items",
  "purchase_orders",
];
