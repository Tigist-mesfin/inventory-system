"use strict";

const { columns } = require("./columns");

exports.up = async (queryInterface, DataTypes) => {
  const { uuidPk, timestamps, fk, money, qty } = columns(DataTypes);

  await queryInterface.createTable("warehouses", {
    id: uuidPk,
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    address: { type: DataTypes.JSON, allowNull: true },
    managerName: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    ...timestamps,
  });
  await queryInterface.addIndex("warehouses", ["status"]);

  await queryInterface.createTable("inventory", {
    id: uuidPk,
    productId: fk("products", { onDelete: "RESTRICT" }),
    warehouseId: fk("warehouses", { onDelete: "RESTRICT" }),
    quantity: qty({ defaultValue: 0 }),
    reservedQuantity: qty({ defaultValue: 0 }),
    averageCost: money({ defaultValue: 0 }),
    lastCountedAt: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("inventory", ["productId", "warehouseId"], {
    unique: true,
  });

  await queryInterface.createTable("document_sequences", {
    id: uuidPk,
    documentType: { type: DataTypes.STRING, allowNull: false, unique: true },
    prefix: { type: DataTypes.STRING, allowNull: false },
    lastValue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    padLength: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 6,
    },
    ...timestamps,
  });
};

exports.downTables = ["document_sequences", "inventory", "warehouses"];
