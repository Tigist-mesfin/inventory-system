module.exports = (sequelize, DataTypes) => {
  const UserWarehouse = sequelize.define(
    "UserWarehouse",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: { type: DataTypes.UUID, allowNull: false },
      warehouseId: { type: DataTypes.UUID, allowNull: false },
    },
    { tableName: "user_warehouses" },
  );

  UserWarehouse.associate = (models) => {
    UserWarehouse.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    UserWarehouse.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
      as: "warehouse",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return UserWarehouse;
};
