module.exports = (sequelize, DataTypes) => {
  const Sale = sequelize.define(
    "Sale",
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

      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      customerName: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      customerPhone: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      saleDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      subtotal: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      taxAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,

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

      totalAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      paymentMethod: {
        type: DataTypes.ENUM(
          "CASH",
          "CARD",
          "BANK_TRANSFER",
          "MOBILE_MONEY",
          "CREDIT",
        ),
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM(
          "DRAFT",
          "COMPLETED",
          "CANCELLED",
          "REFUNDED",
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
      tableName: "sales",

      indexes: [
        { fields: ["warehouseId"] },
        { fields: ["createdBy"] },
        { fields: ["status"] },
        { fields: ["saleDate"] },
      ],
    },
  );

  Sale.associate = (models) => {
    Sale.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
      as: "warehouse",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Sale.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Sale.hasMany(models.SaleItem, {
      foreignKey: "saleId",
      as: "items",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Sale;
};
