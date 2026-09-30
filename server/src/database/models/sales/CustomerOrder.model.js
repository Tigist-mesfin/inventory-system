module.exports = (sequelize, DataTypes) => {
  const CustomerOrder = sequelize.define(
    "CustomerOrder",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      orderNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      customerPhone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      deliveryDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      warehouseId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      saleId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      approvedBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      paymentMethodId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("PENDING", "ON_LOADING", "DELIVERED", "CANCELLED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      paymentStatus: {
        type: DataTypes.ENUM("UNPAID", "PARTIAL", "PAID"),
        allowNull: false,
        defaultValue: "UNPAID",
      },
      subtotal: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      paidAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "customer_orders",
      indexes: [
        { fields: ["status"] },
        { fields: ["paymentStatus"] },
        { fields: ["deliveryDate"] },
        { fields: ["customerPhone"] },
        { fields: ["saleId"] },
      ],
    },
  );

  CustomerOrder.associate = (models) => {
    CustomerOrder.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
      as: "warehouse",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    CustomerOrder.belongsTo(models.Sale, {
      foreignKey: "saleId",
      as: "sale",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    CustomerOrder.belongsTo(models.User, {
      foreignKey: "approvedBy",
      as: "approver",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    CustomerOrder.belongsTo(models.PaymentMethod, {
      foreignKey: "paymentMethodId",
      as: "paymentMethod",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    CustomerOrder.hasMany(models.CustomerOrderItem, {
      foreignKey: "customerOrderId",
      as: "items",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return CustomerOrder;
};
