module.exports = (sequelize, DataTypes) => {
  const StockReceipt = sequelize.define(
    "StockReceipt",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      purchaseOrderId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      warehouseId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      receivedBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      receiptNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      receiptDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      status: {
        type: DataTypes.ENUM(
          "DRAFT",
          "COMPLETED",
          "CANCELLED",
        ),
        allowNull: false,
        defaultValue: "DRAFT",
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "stock_receipts",

      indexes: [
        { fields: ["purchaseOrderId"] },
        { fields: ["warehouseId"] },
        { fields: ["receivedBy"] },
        { fields: ["status"] },
        { fields: ["receiptDate"] },
      ],
    },
  );

  StockReceipt.associate = (models) => {
    StockReceipt.belongsTo(models.PurchaseOrder, {
      foreignKey: "purchaseOrderId",
      as: "purchaseOrder",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    StockReceipt.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
      as: "warehouse",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    StockReceipt.belongsTo(models.User, {
      foreignKey: "receivedBy",
      as: "receiver",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    StockReceipt.hasMany(models.StockReceiptItem, {
      foreignKey: "stockReceiptId",
      as: "items",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return StockReceipt;
};
