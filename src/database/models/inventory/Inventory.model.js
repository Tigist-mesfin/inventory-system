module.exports = (sequelize, DataTypes) => {
  const Inventory = sequelize.define(
    "Inventory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      warehouseId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      quantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      reservedQuantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      averageCost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      lastCountedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "inventory",

      indexes: [
        {
          unique: true,
          fields: ["productId", "warehouseId"],
        },
      ],
    },
  );

  Inventory.associate = (models) => {
    Inventory.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Inventory.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
      as: "warehouse",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return Inventory;
};
