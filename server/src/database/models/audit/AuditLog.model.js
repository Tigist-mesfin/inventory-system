module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

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

      entityType: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      entityId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      oldValues: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      newValues: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "audit_logs",

      indexes: [
        {
          fields: ["userId"],
        },

        {
          fields: ["entityType", "entityId"],
        },

        {
          fields: ["action"],
        },

        {
          fields: ["createdAt"],
        },
      ],
    },
  );

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  };

  return AuditLog;
};
