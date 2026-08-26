module.exports = (sequelize, DataTypes) => {
  const Warehouse = sequelize.define(
    "Warehouse",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      code: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      address: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      managerName: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
    },
    {
      tableName: "warehouses",

      indexes: [{ fields: ["status"] }],
    },
  );

  Warehouse.associate = (models) => {
    Warehouse.belongsTo(models.Company, {
      foreignKey: "companyId",
      as: "company",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Warehouse.belongsToMany(models.User, {
      through: models.UserWarehouse,
      foreignKey: "warehouseId",
      otherKey: "userId",
      as: "users",
    });

    Warehouse.hasMany(models.Inventory, {
      foreignKey: "warehouseId",
      as: "inventory",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Warehouse.hasMany(models.StockTransfer, {
      foreignKey: "sourceWarehouseId",
      as: "outgoingTransfers",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Warehouse.hasMany(models.StockTransfer, {
      foreignKey: "destinationWarehouseId",
      as: "incomingTransfers",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Warehouse.hasMany(models.StockTransaction, {
      foreignKey: "warehouseId",
      as: "stockTransactions",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Warehouse.hasMany(models.StockAdjustment, {
      foreignKey: "warehouseId",
      as: "stockAdjustments",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Warehouse.hasMany(models.StockReceipt, {
      foreignKey: "warehouseId",
      as: "stockReceipts",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Warehouse.hasMany(models.Sale, {
      foreignKey: "warehouseId",
      as: "sales",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return Warehouse;
};
