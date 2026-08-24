module.exports = (sequelize, DataTypes) => {
  const StockTransfer = sequelize.define(
    "StockTransfer",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      sourceWarehouseId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      destinationWarehouseId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      transferNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      transferDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      status: {
        type: DataTypes.ENUM(
          "DRAFT",
          "REQUESTED",
          "APPROVED",
          "IN_TRANSIT",
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
      tableName: "stock_transfers",

      indexes: [
        { fields: ["sourceWarehouseId"] },
        { fields: ["destinationWarehouseId"] },
        { fields: ["createdBy"] },
        { fields: ["status"] },
        { fields: ["transferDate"] },
      ],
    },
  );

  StockTransfer.associate = (models) => {
    StockTransfer.belongsTo(models.Warehouse, {
      foreignKey: "sourceWarehouseId",
      as: "sourceWarehouse",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    StockTransfer.belongsTo(models.Warehouse, {
      foreignKey: "destinationWarehouseId",
      as: "destinationWarehouse",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    StockTransfer.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    StockTransfer.hasMany(models.StockTransferItem, {
      foreignKey: "stockTransferId",
      as: "items",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return StockTransfer;
};
