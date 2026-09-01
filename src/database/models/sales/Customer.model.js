module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    "Customer",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      businessName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      creditLimit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      walletBalance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM("CUSTOMER", "SUPPLIER"),
        allowNull: false,
        defaultValue: "CUSTOMER",
      },
      supplierId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
    },
    {
      tableName: "customers",
      indexes: [
        { fields: ["phone"] },
        { fields: ["status"] },
        { fields: ["name"] },
        { fields: ["createdBy"] },
      ],
    },
  );

  Customer.associate = (models) => {
    Customer.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Customer.hasMany(models.Sale, {
      foreignKey: "customerId",
      as: "sales",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Customer.hasMany(models.CustomerPrice, {
      foreignKey: "customerId",
      as: "prices",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Customer.hasMany(models.CustomerPayment, {
      foreignKey: "customerId",
      as: "payments",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Customer.hasMany(models.CustomerWalletTransaction, {
      foreignKey: "customerId",
      as: "walletTransactions",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Customer.belongsTo(models.Supplier, {
      foreignKey: "supplierId",
      as: "supplier",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  };

  return Customer;
};
