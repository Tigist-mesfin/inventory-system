module.exports = (sequelize, DataTypes) => {
  const DocumentSequence = sequelize.define(
    "DocumentSequence",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      documentType: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      prefix: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      lastValue: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,

        validate: {
          min: 0,
        },
      },

      padLength: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 6,

        validate: {
          min: 1,
          max: 12,
        },
      },
    },
    {
      tableName: "document_sequences",
    },
  );

  DocumentSequence.associate = () => {};

  return DocumentSequence;
};
