"use strict";

const { columns } = require("./columns");

exports.up = async (queryInterface, DataTypes) => {
  const { uuidPk, timestamps, fk } = columns(DataTypes);

  await queryInterface.createTable("roles", {
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
  await queryInterface.addIndex("roles", ["status"]);

  await queryInterface.createTable("permissions", {
    id: uuidPk,
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    module: { type: DataTypes.STRING, allowNull: false },
    action: {
      type: DataTypes.ENUM(
        "CREATE",
        "READ",
        "UPDATE",
        "DELETE",
        "APPROVE",
        "EXPORT",
      ),
      allowNull: false,
    },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    ...timestamps,
  });
  await queryInterface.addIndex("permissions", ["module", "action"], {
    unique: true,
    name: "permissions_module_action_unique",
  });
  await queryInterface.addIndex("permissions", ["status"]);

  await queryInterface.createTable("role_permissions", {
    id: uuidPk,
    roleId: fk("roles", { onDelete: "CASCADE" }),
    permissionId: fk("permissions", { onDelete: "CASCADE" }),
    ...timestamps,
  });
  await queryInterface.addIndex("role_permissions", ["roleId", "permissionId"], {
    unique: true,
  });

  await queryInterface.createTable("users", {
    id: uuidPk,
    roleId: fk("roles", { onDelete: "RESTRICT" }),
    fullName: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE", "SUSPENDED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  });
  await queryInterface.addIndex("users", ["roleId"]);
  await queryInterface.addIndex("users", ["status"]);
  await queryInterface.addIndex("users", ["phone"]);
};

exports.downTables = ["users", "role_permissions", "permissions", "roles"];
