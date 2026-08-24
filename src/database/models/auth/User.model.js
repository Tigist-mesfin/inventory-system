const bcrypt = require("bcrypt");

const BCRYPT_ROUNDS = 12;

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      roleId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE", "SUSPENDED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },

      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "users",

      defaultScope: {
        attributes: { exclude: ["password"] },
      },

      scopes: {
        // Replaces defaultScope when used as User.scope("withPassword")
        withPassword: {},
      },

      indexes: [
        { fields: ["roleId"] },
        { fields: ["status"] },
        { fields: ["phone"] },
      ],

      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed("password") && user.password) {
            user.password = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
          }
        },
      },
    },
  );

  User.prototype.comparePassword = async function comparePassword(plain) {
    return bcrypt.compare(plain, this.password);
  };

  User.associate = (models) => {
    User.belongsTo(models.Role, {
      foreignKey: "roleId",
      as: "role",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    User.hasMany(models.PurchaseOrder, {
      foreignKey: "createdBy",
      as: "purchaseOrders",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    User.hasMany(models.StockReceipt, {
      foreignKey: "receivedBy",
      as: "stockReceipts",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    User.hasMany(models.Sale, {
      foreignKey: "createdBy",
      as: "sales",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    User.hasMany(models.StockTransaction, {
      foreignKey: "createdBy",
      as: "stockTransactions",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    User.hasMany(models.StockAdjustment, {
      foreignKey: "createdBy",
      as: "stockAdjustments",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    User.hasMany(models.StockTransfer, {
      foreignKey: "createdBy",
      as: "stockTransfers",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    User.hasMany(models.AuditLog, {
      foreignKey: "userId",
      as: "auditLogs",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  };

  return User;
};
