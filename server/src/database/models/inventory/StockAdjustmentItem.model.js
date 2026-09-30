module.exports = (sequelize, DataTypes) => {
  const StockAdjustmentItem = sequelize.define(
    "StockAdjustmentItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      stockAdjustmentId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      systemQuantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
      },

      actualQuantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,

        validate: {
          min: 0,
        },
      },

      difference: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
      },

      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "stock_adjustment_items",

      indexes: [
        {
          unique: true,
          fields: ["stockAdjustmentId", "productId"],
          name: "stock_adjustment_items_adj_product_unique",
        },
        { fields: ["productId"] },
      ],
    },
  );

  StockAdjustmentItem.associate = (models) => {
    StockAdjustmentItem.belongsTo(models.StockAdjustment, {
      foreignKey: "stockAdjustmentId",
      as: "stockAdjustment",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    StockAdjustmentItem.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return StockAdjustmentItem;
};
