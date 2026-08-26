module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define(
    "Expense",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      expenseDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      category: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(256),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0.01 },
      },
      paymentMethod: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "expenses",
    },
  );

  Expense.associate = (models) => {
    Expense.belongsTo(models.Company, {
      foreignKey: "companyId",
      as: "company",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    Expense.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return Expense;
};
