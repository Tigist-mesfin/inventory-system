module.exports = (sequelize, DataTypes) => {
  const StockReceiptItem = sequelize.define(
    "StockReceiptItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      stockReceiptId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      purchaseOrderItemId: {
        type: DataTypes.UUID,
        allowNull: true,
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

      unitCost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,

        validate: {
          min: 0,
        },
      },

      batchNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "stock_receipt_items",

      indexes: [
        { fields: ["stockReceiptId"] },
        { fields: ["purchaseOrderItemId"] },
        { fields: ["productId"] },
      ],
    },
  );

  StockReceiptItem.associate = (models) => {
    StockReceiptItem.belongsTo(models.StockReceipt, {
      foreignKey: "stockReceiptId",
      as: "stockReceipt",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    StockReceiptItem.belongsTo(models.PurchaseOrderItem, {
      foreignKey: "purchaseOrderItemId",
      as: "purchaseOrderItem",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    StockReceiptItem.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return StockReceiptItem;
};
