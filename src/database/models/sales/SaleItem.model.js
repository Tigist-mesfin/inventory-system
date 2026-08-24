module.exports = (sequelize, DataTypes) => {
  const SaleItem = sequelize.define(
    "SaleItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      saleId: {
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

      unitPrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,

        validate: {
          min: 0,
        },
      },

      discountAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,

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
    },
    {
      tableName: "sale_items",

      indexes: [
        {
          unique: true,
          fields: ["saleId", "productId"],
          name: "sale_items_sale_product_unique",
        },
        { fields: ["productId"] },
      ],
    },
  );

  SaleItem.associate = (models) => {
    SaleItem.belongsTo(models.Sale, {
      foreignKey: "saleId",
      as: "sale",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    SaleItem.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return SaleItem;
};
