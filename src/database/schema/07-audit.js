"use strict";

const { columns } = require("./columns");

exports.up = async (queryInterface, DataTypes) => {
  const { uuidPk, timestamps, fk } = columns(DataTypes);

  await queryInterface.createTable("audit_logs", {
    id: uuidPk,
    userId: fk("users", { allowNull: true, onDelete: "SET NULL" }),
    action: {
      type: DataTypes.ENUM(
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "APPROVE",
        "CANCEL",
        "STOCK_IN",
        "STOCK_OUT",
        "TRANSFER",
        "ADJUSTMENT",
      ),
      allowNull: false,
    },
    entityType: { type: DataTypes.STRING, allowNull: false },
    entityId: { type: DataTypes.UUID, allowNull: true },
    oldValues: { type: DataTypes.JSON, allowNull: true },
    newValues: { type: DataTypes.JSON, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("audit_logs", ["userId"]);
  await queryInterface.addIndex("audit_logs", ["entityType", "entityId"]);
  await queryInterface.addIndex("audit_logs", ["action"]);
  await queryInterface.addIndex("audit_logs", ["createdAt"]);
};

exports.downTables = ["audit_logs"];
