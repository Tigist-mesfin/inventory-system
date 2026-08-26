module.exports = (sequelize, DataTypes) => {
  const SupplierPayment = sequelize.define(
    "SupplierPayment",
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
      supplierId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      purchaseOrderId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      recordedBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0.01 },
      },
      method: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "supplier_payments",
      indexes: [
        { fields: ["supplierId"] },
        { fields: ["purchaseOrderId"] },
        { fields: ["recordedBy"] },
        { fields: ["paidAt"] },
      ],
    },
  );

  SupplierPayment.associate = (models) => {
    SupplierPayment.belongsTo(models.Supplier, {
      foreignKey: "supplierId",
      as: "supplier",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    SupplierPayment.belongsTo(models.PurchaseOrder, {
      foreignKey: "purchaseOrderId",
      as: "purchaseOrder",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    SupplierPayment.belongsTo(models.User, {
      foreignKey: "recordedBy",
      as: "recorder",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return SupplierPayment;
};
