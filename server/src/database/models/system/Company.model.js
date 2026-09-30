module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define(
    "Company",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: false },
      address: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
    },
    { tableName: "companies" },
  );

  Company.associate = (models) => {
    Company.hasMany(models.User, {
      foreignKey: "companyId",
      as: "users",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    Company.hasMany(models.Warehouse, {
      foreignKey: "companyId",
      as: "warehouses",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    Company.hasMany(models.Expense, {
      foreignKey: "companyId",
      as: "expenses",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    Company.hasMany(models.OtherIncome, {
      foreignKey: "companyId",
      as: "otherIncomes",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return Company;
};
