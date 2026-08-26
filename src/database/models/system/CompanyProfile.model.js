module.exports = (sequelize, DataTypes) => {
  const CompanyProfile = sequelize.define(
    "CompanyProfile",
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
      name: { type: DataTypes.STRING, allowNull: true },
      address: { type: DataTypes.STRING, allowNull: true },
      phone: { type: DataTypes.STRING, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: true },
      tin: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: "company_profiles" },
  );

  CompanyProfile.associate = () => {};
  return CompanyProfile;
};
