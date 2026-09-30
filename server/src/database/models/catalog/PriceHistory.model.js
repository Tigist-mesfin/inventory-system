module.exports = (sequelize, DataTypes) => {
  const PriceHistory = sequelize.define(
    "PriceHistory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      changedBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      purchasePrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      sellingPrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      note: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "price_histories",
      indexes: [
        { fields: ["productId"] },
        { fields: ["changedBy"] },
        { fields: ["createdAt"] },
      ],
    },
  );

  PriceHistory.associate = (models) => {
    PriceHistory.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    PriceHistory.belongsTo(models.User, {
      foreignKey: "changedBy",
      as: "changer",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return PriceHistory;
};
