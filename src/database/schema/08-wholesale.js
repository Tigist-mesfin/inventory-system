"use strict";

const { columns } = require("./columns");

exports.up = async (queryInterface, DataTypes) => {
  const { uuidPk, timestamps, fk, money, qty } = columns(DataTypes);

  await queryInterface.addColumn("products", "brand", {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await queryInterface.addColumn("products", "size", {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await queryInterface.addColumn("products", "color", {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await queryInterface.addIndex("products", ["brand"]);
  await queryInterface.addIndex("products", ["size"]);
  await queryInterface.addIndex("products", ["color"]);

  await queryInterface.createTable("customers", {
    id: uuidPk,
    createdBy: fk("users", { onDelete: "RESTRICT" }),
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    businessName: { type: DataTypes.STRING, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },
    creditLimit: money({ defaultValue: 0 }),
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    ...timestamps,
  });
  await queryInterface.addIndex("customers", ["phone"]);
  await queryInterface.addIndex("customers", ["status"]);
  await queryInterface.addIndex("customers", ["name"]);
  await queryInterface.addIndex("customers", ["createdBy"]);

  await queryInterface.addColumn("sales", "customerId", {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "customers", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  });
  await queryInterface.addColumn("sales", "dueDate", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await queryInterface.addColumn("sales", "paidAmount", money({ defaultValue: 0 }));
  await queryInterface.addIndex("sales", ["customerId"]);
  await queryInterface.addIndex("sales", ["dueDate"]);

  await queryInterface.addColumn("purchase_orders", "dueDate", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await queryInterface.addColumn(
    "purchase_orders",
    "paidAmount",
    money({ defaultValue: 0 }),
  );

  await queryInterface.createTable("customer_prices", {
    id: uuidPk,
    customerId: fk("customers", { onDelete: "CASCADE" }),
    productId: fk("products", { onDelete: "RESTRICT" }),
    unitPrice: money(),
    minQuantity: qty({ defaultValue: 1 }),
    ...timestamps,
  });
  await queryInterface.addIndex(
    "customer_prices",
    ["customerId", "productId", "minQuantity"],
    { unique: true, name: "customer_prices_unique_tier" },
  );
  await queryInterface.addIndex("customer_prices", ["productId"]);

  await queryInterface.createTable("customer_payments", {
    id: uuidPk,
    customerId: fk("customers", { onDelete: "RESTRICT" }),
    saleId: fk("sales", { allowNull: true, onDelete: "RESTRICT" }),
    recordedBy: fk("users", { onDelete: "RESTRICT" }),
    amount: money(),
    method: {
      type: DataTypes.ENUM("CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY"),
      allowNull: false,
    },
    paidAt: { type: DataTypes.DATE, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("customer_payments", ["customerId"]);
  await queryInterface.addIndex("customer_payments", ["saleId"]);
  await queryInterface.addIndex("customer_payments", ["recordedBy"]);
  await queryInterface.addIndex("customer_payments", ["paidAt"]);

  await queryInterface.createTable("price_histories", {
    id: uuidPk,
    productId: fk("products", { onDelete: "CASCADE" }),
    changedBy: fk("users", { onDelete: "RESTRICT" }),
    purchasePrice: money(),
    sellingPrice: money(),
    note: { type: DataTypes.STRING, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("price_histories", ["productId"]);
  await queryInterface.addIndex("price_histories", ["changedBy"]);
  await queryInterface.addIndex("price_histories", ["createdAt"]);

  await queryInterface.createTable("supplier_payments", {
    id: uuidPk,
    supplierId: fk("suppliers", { onDelete: "RESTRICT" }),
    purchaseOrderId: fk("purchase_orders", {
      allowNull: true,
      onDelete: "RESTRICT",
    }),
    recordedBy: fk("users", { onDelete: "RESTRICT" }),
    amount: money(),
    method: {
      type: DataTypes.ENUM("CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY"),
      allowNull: false,
    },
    paidAt: { type: DataTypes.DATE, allowNull: false },
    dueDate: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("supplier_payments", ["supplierId"]);
  await queryInterface.addIndex("supplier_payments", ["purchaseOrderId"]);
  await queryInterface.addIndex("supplier_payments", ["recordedBy"]);
  await queryInterface.addIndex("supplier_payments", ["paidAt"]);

  await queryInterface.addIndex(
    "stock_transfer_items",
    ["stockTransferId", "productId"],
    { unique: true, name: "stock_transfer_items_transfer_product_unique" },
  );
};

exports.downTables = [
  "supplier_payments",
  "price_histories",
  "customer_payments",
  "customer_prices",
  "customers",
];
