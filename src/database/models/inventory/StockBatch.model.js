module.exports = (sequelize, DataTypes) => {
  const StockBatch = sequelize.define(
    "StockBatch",
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
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      warehouseId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      purchaseOrderId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      purchaseOrderItemId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      sourceBatchId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      sourceType: {
        type: DataTypes.ENUM("PURCHASE", "TRANSFER", "ADJUSTMENT", "OPENING"),
        allowNull: false,
        defaultValue: "PURCHASE",
      },
      purchaseDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      unitCost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      originalQuantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        validate: { min: 0 },
      },
      remainingQuantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        validate: { min: 0 },
      },
    },
    {
      tableName: "stock_batches",
      indexes: [
        { fields: ["productId", "warehouseId"] },
        { fields: ["purchaseOrderItemId"] },
        { fields: ["purchaseDate"] },
        { fields: ["companyId"] },
        { fields: ["sourceType"] },
      ],
    },
  );

  StockBatch.associate = (models) => {
    StockBatch.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    StockBatch.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
      as: "warehouse",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    StockBatch.belongsTo(models.PurchaseOrder, {
      foreignKey: "purchaseOrderId",
      as: "purchaseOrder",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    StockBatch.belongsTo(models.PurchaseOrderItem, {
      foreignKey: "purchaseOrderItemId",
      as: "purchaseOrderItem",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    StockBatch.belongsTo(models.StockBatch, {
      foreignKey: "sourceBatchId",
      as: "sourceBatch",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    StockBatch.hasMany(models.StockBatch, {
      foreignKey: "sourceBatchId",
      as: "childBatches",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    StockBatch.hasMany(models.SaleCostAllocation, {
      foreignKey: "stockBatchId",
      as: "costAllocations",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return StockBatch;
};
