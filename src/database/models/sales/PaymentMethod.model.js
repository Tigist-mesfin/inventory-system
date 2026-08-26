module.exports = (sequelize, DataTypes) => {
  const PaymentMethod = sequelize.define(
    "PaymentMethod",
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
      name: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
    },
    {
      tableName: "payment_methods",
      indexes: [{ fields: ["status"] }],
    },
  );

  return PaymentMethod;
};
