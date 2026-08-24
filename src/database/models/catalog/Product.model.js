module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    "Product",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      categoryId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      supplierId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      sku: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      barcode: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      unit: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "PCS",
      },

      purchasePrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      sellingPrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      reorderLevel: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      reorderQuantity: {
        type: DataTypes.DECIMAL(15, 3),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      trackBatch: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      trackExpiry: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
    },
    {
      tableName: "products",

      indexes: [
        { fields: ["categoryId"] },
        { fields: ["supplierId"] },
        { fields: ["status"] },
        { fields: ["name"] },
      ],
    },
  );

  Product.associate = (models) => {
    Product.belongsTo(models.Category, {
      foreignKey: "categoryId",
      as: "category",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Product.belongsTo(models.Supplier, {
      foreignKey: "supplierId",
      as: "supplier",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    Product.hasMany(models.Inventory, {
      foreignKey: "productId",
      as: "inventory",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Product.hasMany(models.StockTransferItem, {
      foreignKey: "productId",
      as: "stockTransferItems",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Product.hasMany(models.StockTransaction, {
      foreignKey: "productId",
      as: "stockTransactions",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Product.hasMany(models.StockAdjustmentItem, {
      foreignKey: "productId",
      as: "stockAdjustmentItems",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Product.hasMany(models.PurchaseOrderItem, {
      foreignKey: "productId",
      as: "purchaseOrderItems",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Product.hasMany(models.StockReceiptItem, {
      foreignKey: "productId",
      as: "stockReceiptItems",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Product.hasMany(models.SaleItem, {
      foreignKey: "productId",
      as: "saleItems",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return Product;
};
