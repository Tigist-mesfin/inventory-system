module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define(
    "Permission",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      module: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      action: {
        type: DataTypes.ENUM(
          "CREATE",
          "READ",
          "UPDATE",
          "DELETE",
          "APPROVE",
          "EXPORT",
        ),
        allowNull: false,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
    },
    {
      tableName: "permissions",

      indexes: [
        {
          unique: true,
          fields: ["module", "action"],
          name: "permissions_module_action_unique",
        },
        { fields: ["status"] },
      ],
    },
  );

  Permission.associate = (models) => {
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      foreignKey: "permissionId",
      otherKey: "roleId",
      as: "roles",
    });

    Permission.belongsToMany(models.User, {
      through: models.UserPermission,
      foreignKey: "permissionId",
      otherKey: "userId",
      as: "users",
    });
  };

  return Permission;
};
