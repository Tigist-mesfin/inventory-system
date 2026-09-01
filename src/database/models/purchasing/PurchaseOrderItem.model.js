module.exports = (sequelize, DataTypes) => {
  const PurchaseOrderItem = sequelize.define(
    "PurchaseOrderItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      purchaseOrderId: {
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

      unitPrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,

        validate: {
          min: 0,
        },
      },

      totalPrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      deliveryStatus: {
        type: DataTypes.ENUM("NOT_DELIVERED", "ON_LOADING", "DELIVERED"),
        allowNull: false,
        defaultValue: "NOT_DELIVERED",
      },

      warehouseId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "purchase_order_items",

      indexes: [
        {
          unique: true,
          fields: ["purchaseOrderId", "productId"],
          name: "purchase_order_items_po_product_unique",
        },
        { fields: ["productId"] },
        { fields: ["deliveryStatus"] },
        { fields: ["warehouseId"] },
      ],
    },
  );

  PurchaseOrderItem.associate = (models) => {
    PurchaseOrderItem.belongsTo(models.PurchaseOrder, {
      foreignKey: "purchaseOrderId",
      as: "purchaseOrder",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    PurchaseOrderItem.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    PurchaseOrderItem.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
      as: "warehouse",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    PurchaseOrderItem.hasMany(models.StockReceiptItem, {
      foreignKey: "purchaseOrderItemId",
      as: "receiptItems",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    PurchaseOrderItem.hasMany(models.StockBatch, {
      foreignKey: "purchaseOrderItemId",
      as: "stockBatches",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  };

  return PurchaseOrderItem;
};
