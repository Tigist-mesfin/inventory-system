module.exports = (sequelize, DataTypes) => {
  const SaleCostAllocation = sequelize.define(
    "SaleCostAllocation",
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
      saleId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      saleItemId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      stockBatchId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        validate: { min: 0.001 },
      },
      unitCost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      totalCost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      costingMethod: {
        type: DataTypes.ENUM("SIMPLE", "FIFO", "MANUAL"),
        allowNull: false,
        defaultValue: "SIMPLE",
      },
    },
    {
      tableName: "sale_cost_allocations",
      indexes: [
        { fields: ["saleId"] },
        { fields: ["saleItemId"] },
        { fields: ["stockBatchId"] },
        { fields: ["companyId"] },
      ],
    },
  );

  SaleCostAllocation.associate = (models) => {
    SaleCostAllocation.belongsTo(models.Sale, {
      foreignKey: "saleId",
      as: "sale",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    SaleCostAllocation.belongsTo(models.SaleItem, {
      foreignKey: "saleItemId",
      as: "saleItem",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    SaleCostAllocation.belongsTo(models.StockBatch, {
      foreignKey: "stockBatchId",
      as: "stockBatch",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return SaleCostAllocation;
};
