module.exports = (sequelize, DataTypes) => {
  const CustomerPayment = sequelize.define(
    "CustomerPayment",
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
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0.01 },
      },
      method: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "customer_payments",
      indexes: [
        { fields: ["customerId"] },
        { fields: ["saleId"] },
        { fields: ["recordedBy"] },
        { fields: ["paidAt"] },
      ],
    },
  );

  CustomerPayment.associate = (models) => {
    CustomerPayment.belongsTo(models.Customer, {
      foreignKey: "customerId",
      as: "customer",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    CustomerPayment.belongsTo(models.Sale, {
      foreignKey: "saleId",
      as: "sale",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    CustomerPayment.belongsTo(models.User, {
      foreignKey: "recordedBy",
      as: "recorder",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return CustomerPayment;
};
