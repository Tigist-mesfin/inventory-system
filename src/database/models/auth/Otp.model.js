module.exports = (sequelize, DataTypes) => {
  const Otp = sequelize.define(
    "Otp",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      otp: {
        type: DataTypes.STRING(4),
        allowNull: false,
      },

      purpose: {
        type: DataTypes.ENUM("REGISTRATION", "PASSWORD_RESET", "LOGIN"),
        allowNull: false,
      },

      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      attemptCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "otps",
      updatedAt: false,
      indexes: [
        { fields: ["userId"] },
        { fields: ["phone"] },
        { fields: ["purpose"] },
        { fields: ["phone", "purpose", "used"] },
        { fields: ["expiresAt"] },
        { fields: ["createdAt"] },
      ],
    },
  );

  Otp.associate = (models) => {
    Otp.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Otp;
};
