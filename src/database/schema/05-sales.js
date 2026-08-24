"use strict";

const { columns } = require("./columns");

exports.up = async (queryInterface, DataTypes) => {
  const { uuidPk, timestamps, fk, money, qty } = columns(DataTypes);

  await queryInterface.createTable("sales", {
    id: uuidPk,
    warehouseId: fk("warehouses", { onDelete: "RESTRICT" }),
    createdBy: fk("users", { onDelete: "RESTRICT" }),
    invoiceNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
    customerName: { type: DataTypes.STRING, allowNull: true },
    customerPhone: { type: DataTypes.STRING, allowNull: true },
    saleDate: { type: DataTypes.DATE, allowNull: false },
    subtotal: money({ defaultValue: 0 }),
    taxAmount: money({ defaultValue: 0 }),
    discountAmount: money({ defaultValue: 0 }),
    totalAmount: money({ defaultValue: 0 }),
    paymentMethod: {
      type: DataTypes.ENUM(
        "CASH",
        "CARD",
        "BANK_TRANSFER",
        "MOBILE_MONEY",
        "CREDIT",
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("DRAFT", "COMPLETED", "CANCELLED", "REFUNDED"),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("sales", ["warehouseId"]);
  await queryInterface.addIndex("sales", ["createdBy"]);
  await queryInterface.addIndex("sales", ["status"]);
  await queryInterface.addIndex("sales", ["saleDate"]);

  await queryInterface.createTable("sale_items", {
    id: uuidPk,
    saleId: fk("sales", { onDelete: "CASCADE" }),
    productId: fk("products", { onDelete: "RESTRICT" }),
    quantity: qty(),
    unitPrice: money(),
    discountAmount: money({ defaultValue: 0 }),
    totalPrice: money({ defaultValue: 0 }),
    ...timestamps,
  });
  await queryInterface.addIndex("sale_items", ["saleId", "productId"], {
    unique: true,
    name: "sale_items_sale_product_unique",
  });
  await queryInterface.addIndex("sale_items", ["productId"]);
};

exports.downTables = ["sale_items", "sales"];
