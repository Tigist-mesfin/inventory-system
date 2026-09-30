module.exports = (sequelize, DataTypes) => {
  const OtherIncome = sequelize.define(
    "OtherIncome",
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
      incomeDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      receivedFrom: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      reason: {
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
      tableName: "other_incomes",
    },
  );

  OtherIncome.associate = (models) => {
    OtherIncome.belongsTo(models.Company, {
      foreignKey: "companyId",
      as: "company",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    OtherIncome.belongsTo(models.User, {
      foreignKey: "createdBy",
      as: "creator",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return OtherIncome;
};
