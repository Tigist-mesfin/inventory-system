module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      roleId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      permissionId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "role_permissions",

      indexes: [
        {
          unique: true,
          fields: ["roleId", "permissionId"],
        },
      ],
    },
  );

  RolePermission.associate = (models) => {
    RolePermission.belongsTo(models.Role, {
      foreignKey: "roleId",
      as: "role",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    RolePermission.belongsTo(models.Permission, {
      foreignKey: "permissionId",
      as: "permission",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return RolePermission;
};
