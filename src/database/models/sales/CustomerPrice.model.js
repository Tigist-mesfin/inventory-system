module.exports = (sequelize, DataTypes) => {
  const CustomerPrice = sequelize.define(
    "CustomerPrice",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      unitPrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      minQuantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        defaultValue: 1,
        validate: { min: 0 },
      },
    },
    {
      tableName: "customer_prices",
      indexes: [
        {
          unique: true,
          fields: ["customerId", "productId", "minQuantity"],
          name: "customer_prices_unique_tier",
        },
        { fields: ["productId"] },
      ],
    },
  );

  CustomerPrice.associate = (models) => {
    CustomerPrice.belongsTo(models.Customer, {
      foreignKey: "customerId",
      as: "customer",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    CustomerPrice.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return CustomerPrice;
};
