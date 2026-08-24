module.exports = (sequelize, DataTypes) => {
  const PurchaseOrder = sequelize.define(
    "PurchaseOrder",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      supplierId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      orderNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      orderDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      expectedDate: {
        type: DataTypes.DATE,
        allowNull: true,
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

      status: {
        type: DataTypes.ENUM(
          "DRAFT",
          "SUBMITTED",
          "APPROVED",
          "PARTIALLY_RECEIVED",
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
      tableName: "purchase_orders",

      indexes: [
        { fields: ["supplierId"] },
        { fields: ["createdBy"] },
        { fields: ["status"] },
        { fields: ["orderDate"] },
      ],
    },
  );

  PurchaseOrder.associate = (models) => {
    PurchaseOrder.belongsTo(models.Supplier, {
      foreignKey: "supplierId",
      as: "supplier",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    PurchaseOrder.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    PurchaseOrder.hasMany(models.PurchaseOrderItem, {
      foreignKey: "purchaseOrderId",
      as: "items",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    PurchaseOrder.hasMany(models.StockReceipt, {
      foreignKey: "purchaseOrderId",
      as: "receipts",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return PurchaseOrder;
};

