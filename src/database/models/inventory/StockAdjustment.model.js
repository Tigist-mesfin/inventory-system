module.exports = (sequelize, DataTypes) => {
  const StockAdjustment = sequelize.define(
    "StockAdjustment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      warehouseId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      adjustmentNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      adjustmentDate: {
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
      tableName: "stock_adjustments",

      indexes: [
        { fields: ["warehouseId"] },
        { fields: ["createdBy"] },
        { fields: ["status"] },
        { fields: ["adjustmentDate"] },
      ],
    },
  );

  StockAdjustment.associate = (models) => {
    StockAdjustment.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
      as: "warehouse",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    StockAdjustment.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    StockAdjustment.hasMany(models.StockAdjustmentItem, {
      foreignKey: "stockAdjustmentId",
      as: "items",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return StockAdjustment;
};
