module.exports = (sequelize, DataTypes) => {
  const StockTransaction = sequelize.define(
    "StockTransaction",
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

      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      type: {
        type: DataTypes.ENUM(
          "PURCHASE",
          "SALE",
          "SALE_RETURN",
          "PURCHASE_RETURN",
          "TRANSFER_IN",
          "TRANSFER_OUT",
          "ADJUSTMENT_IN",
          "ADJUSTMENT_OUT",
        ),
        allowNull: false,
      },

      quantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,

        validate: {
          min: 0.001,
        },
      },

      quantityBefore: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
      },

      quantityAfter: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
      },

      unitCost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,

        validate: {
          min: 0,
        },
      },

      referenceType: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      referenceId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "stock_transactions",

      indexes: [
        {
          fields: ["productId", "warehouseId"],
        },

        {
          fields: ["referenceType", "referenceId"],
        },

        {
          fields: ["type"],
        },

        {
          fields: ["createdBy"],
        },

        {
          fields: ["createdAt"],
        },

        {
          unique: true,
          fields: [
            "referenceType",
            "referenceId",
            "type",
            "productId",
            "warehouseId",
          ],
          name: "stock_transactions_idempotency_unique",
        },
      ],
    },
  );

  StockTransaction.associate = (models) => {
    StockTransaction.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    StockTransaction.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
      as: "warehouse",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    StockTransaction.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return StockTransaction;
};
