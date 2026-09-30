"use strict";

const { columns } = require("./columns");

exports.up = async (queryInterface, DataTypes) => {
  const { uuidPk, timestamps, fk, money, qty } = columns(DataTypes);

  await queryInterface.createTable("categories", {
    id: uuidPk,
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    ...timestamps,
  });
  await queryInterface.addIndex("categories", ["status"]);

  await queryInterface.createTable("suppliers", {
    id: uuidPk,
    name: { type: DataTypes.STRING, allowNull: false },
    contactPerson: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.JSON, allowNull: true },
    paymentTerms: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    ...timestamps,
  });
  await queryInterface.addIndex("suppliers", ["status"]);

  await queryInterface.createTable("products", {
    id: uuidPk,
    categoryId: fk("categories", { onDelete: "RESTRICT" }),
    supplierId: fk("suppliers", { allowNull: true, onDelete: "SET NULL" }),
    sku: { type: DataTypes.STRING, allowNull: false, unique: true },
    barcode: { type: DataTypes.STRING, allowNull: true, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    unit: { type: DataTypes.STRING, allowNull: false, defaultValue: "PCS" },
    purchasePrice: money({ defaultValue: 0 }),
    sellingPrice: money({ defaultValue: 0 }),
    reorderLevel: qty({ defaultValue: 0 }),
    reorderQuantity: qty({ defaultValue: 0 }),
    trackBatch: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    trackExpiry: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    ...timestamps,
  });
  await queryInterface.addIndex("products", ["categoryId"]);
  await queryInterface.addIndex("products", ["supplierId"]);
  await queryInterface.addIndex("products", ["status"]);
  await queryInterface.addIndex("products", ["name"]);
};

exports.downTables = ["products", "suppliers", "categories"];
