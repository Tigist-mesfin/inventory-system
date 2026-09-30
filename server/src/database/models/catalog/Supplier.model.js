module.exports = (sequelize, DataTypes) => {
  const Supplier = sequelize.define(
    "Supplier",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      contactPerson: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },

      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      address: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      paymentTerms: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
    },
    {
      tableName: "suppliers",

      indexes: [{ fields: ["status"] }],
    },
  );

  Supplier.associate = (models) => {
    Supplier.hasMany(models.Product, {
      foreignKey: "supplierId",
      as: "products",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    Supplier.hasMany(models.PurchaseOrder, {
      foreignKey: "supplierId",
      as: "purchaseOrders",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Supplier.hasMany(models.SupplierPayment, {
      foreignKey: "supplierId",
      as: "payments",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return Supplier;
};
