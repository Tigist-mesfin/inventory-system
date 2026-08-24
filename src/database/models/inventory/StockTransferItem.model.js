module.exports = (sequelize, DataTypes) => {
  const StockTransferItem = sequelize.define(
    "StockTransferItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      stockTransferId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      quantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,

        validate: {
          min: 0.001,
        },
      },

      receivedQuantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },
    },
    {
      tableName: "stock_transfer_items",

      indexes: [
        { fields: ["stockTransferId"] },
        { fields: ["productId"] },
      ],
    },
  );

  StockTransferItem.associate = (models) => {
    StockTransferItem.belongsTo(models.StockTransfer, {
      foreignKey: "stockTransferId",
      as: "stockTransfer",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    StockTransferItem.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return StockTransferItem;
};
