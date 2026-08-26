module.exports = (sequelize, DataTypes) => {
  const UserPermission = sequelize.define(
    "UserPermission",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: { type: DataTypes.UUID, allowNull: false },
      permissionId: { type: DataTypes.UUID, allowNull: false },
    },
    { tableName: "user_permissions" },
  );

  UserPermission.associate = (models) => {
    UserPermission.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    UserPermission.belongsTo(models.Permission, {
      foreignKey: "permissionId",
      as: "permission",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return UserPermission;
};
