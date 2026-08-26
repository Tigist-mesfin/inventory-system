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

      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      customerId: {
        type: DataTypes.UUID,
        allowNull: true,
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

      paidAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      paymentMethod: {
        type: DataTypes.STRING(64),
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
        { fields: ["customerId"] },
        { fields: ["status"] },
        { fields: ["saleDate"] },
        { fields: ["dueDate"] },
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

    Sale.belongsTo(models.Customer, {
      foreignKey: "customerId",
      as: "customer",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Sale.hasMany(models.SaleItem, {
      foreignKey: "saleId",
      as: "items",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Sale.hasMany(models.CustomerPayment, {
      foreignKey: "saleId",
      as: "payments",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return Sale;
};
