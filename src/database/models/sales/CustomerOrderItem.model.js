module.exports = (sequelize, DataTypes) => {
  const CustomerOrderItem = sequelize.define(
    "CustomerOrderItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      customerOrderId: {
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
        validate: { min: 0.001 },
      },
      unitPrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      totalPrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "customer_order_items",
      indexes: [
        {
          unique: true,
          fields: ["customerOrderId", "productId"],
          name: "customer_order_items_order_product_unique",
        },
        { fields: ["productId"] },
      ],
    },
  );

  CustomerOrderItem.associate = (models) => {
    CustomerOrderItem.belongsTo(models.CustomerOrder, {
      foreignKey: "customerOrderId",
      as: "customerOrder",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    CustomerOrderItem.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return CustomerOrderItem;
};
