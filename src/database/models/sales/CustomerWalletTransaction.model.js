module.exports = (sequelize, DataTypes) => {
  const CustomerWalletTransaction = sequelize.define(
    "CustomerWalletTransaction",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      saleId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      recordedBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("DEPOSIT", "SALE", "REFUND"),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0.01 },
      },
      method: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      occurredAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "customer_wallet_transactions",
      indexes: [
        { fields: ["customerId"] },
        { fields: ["saleId"] },
        { fields: ["companyId"] },
        { fields: ["occurredAt"] },
        { fields: ["type"] },
      ],
    },
  );

  CustomerWalletTransaction.associate = (models) => {
    CustomerWalletTransaction.belongsTo(models.Customer, {
      foreignKey: "customerId",
      as: "customer",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    CustomerWalletTransaction.belongsTo(models.Sale, {
      foreignKey: "saleId",
      as: "sale",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    CustomerWalletTransaction.belongsTo(models.User, {
      foreignKey: "recordedBy",
      as: "recorder",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return CustomerWalletTransaction;
};
