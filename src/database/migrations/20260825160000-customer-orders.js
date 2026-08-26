"use strict";

const { DataTypes } = require("sequelize");
const { columns } = require("../schema/columns");

module.exports = {
  async up(queryInterface) {
    const { uuidPk, timestamps, fk, money, qty } = columns(DataTypes);

    await queryInterface.sequelize.query(
      "ALTER TABLE sales MODIFY paymentMethod VARCHAR(64) NOT NULL",
    ).catch(() => {});

    const tables = (await queryInterface.showAllTables()).map((t) =>
      String(t).toLowerCase(),
    );
    const has = (name) => tables.includes(name);

    if (!has("payment_methods")) {
      await queryInterface.createTable("payment_methods", {
      id: uuidPk,
      name: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      ...timestamps,
    });
    }

    if (!has("customer_orders")) {
    await queryInterface.createTable("customer_orders", {
      id: uuidPk,
      orderNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
      customerName: { type: DataTypes.STRING, allowNull: false },
      customerPhone: { type: DataTypes.STRING, allowNull: false },
      deliveryDate: { type: DataTypes.DATE, allowNull: false },
      warehouseId: fk("warehouses", { allowNull: true, onDelete: "RESTRICT" }),
      saleId: fk("sales", { allowNull: true, onDelete: "RESTRICT" }),
      approvedBy: fk("users", { allowNull: true, onDelete: "RESTRICT" }),
      paymentMethodId: fk("payment_methods", { allowNull: true, onDelete: "RESTRICT" }),
      status: {
        type: DataTypes.ENUM("PENDING", "ON_LOADING", "DELIVERED", "CANCELLED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      paymentStatus: {
        type: DataTypes.ENUM("UNPAID", "PARTIAL", "PAID"),
        allowNull: false,
        defaultValue: "UNPAID",
      },
      subtotal: money({ defaultValue: 0 }),
      totalAmount: money({ defaultValue: 0 }),
      paidAmount: money({ defaultValue: 0 }),
      notes: { type: DataTypes.TEXT, allowNull: true },
      approvedAt: { type: DataTypes.DATE, allowNull: true },
      ...timestamps,
    });
    }
    await queryInterface.addIndex("customer_orders", ["status"]).catch(() => {});
    await queryInterface.addIndex("customer_orders", ["paymentStatus"]).catch(() => {});
    await queryInterface.addIndex("customer_orders", ["deliveryDate"]).catch(() => {});
    await queryInterface.addIndex("customer_orders", ["customerPhone"]).catch(() => {});
    await queryInterface.addIndex("customer_orders", ["saleId"]).catch(() => {});

    if (!has("customer_order_items")) {
    await queryInterface.createTable("customer_order_items", {
      id: uuidPk,
      customerOrderId: fk("customer_orders", { onDelete: "CASCADE" }),
      productId: fk("products", { onDelete: "RESTRICT" }),
      quantity: qty(),
      unitPrice: money(),
      totalPrice: money({ defaultValue: 0 }),
      ...timestamps,
    });
    }
    await queryInterface.addIndex(
      "customer_order_items",
      ["customerOrderId", "productId"],
      { unique: true, name: "customer_order_items_order_product_unique" },
    ).catch(() => {});
    await queryInterface.addIndex("customer_order_items", ["productId"]).catch(() => {});

    const { randomUUID } = require("crypto");
    const now = new Date();
    await queryInterface.bulkInsert("document_sequences", [
      {
        id: randomUUID(),
        documentType: "CUSTOMER_ORDER",
        prefix: "ORD",
        lastValue: 0,
        padLength: 6,
        createdAt: now,
        updatedAt: now,
      },
    ]).catch(() => {});

    await queryInterface.bulkInsert(
      "payment_methods",
      ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY", "CREDIT"].map((name) => ({
        id: randomUUID(),
        name,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      })),
    ).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("customer_order_items");
    await queryInterface.dropTable("customer_orders");
    await queryInterface.dropTable("payment_methods");
  },
};
