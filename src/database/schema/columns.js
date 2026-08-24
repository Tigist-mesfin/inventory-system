"use strict";

function columns(DataTypes) {
  const uuidPk = {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  };

  const timestamps = {
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  };

  const fk = (table, extra = {}) => ({
    type: DataTypes.UUID,
    allowNull: extra.allowNull ?? false,
    references: { model: table, key: "id" },
    onUpdate: "CASCADE",
    onDelete: extra.onDelete,
  });

  const money = (extra = {}) => {
    const col = {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: extra.allowNull ?? false,
    };
    if (extra.defaultValue !== undefined) col.defaultValue = extra.defaultValue;
    return col;
  };

  const qty = (extra = {}) => {
    const col = {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: extra.allowNull ?? false,
    };
    if (extra.defaultValue !== undefined) col.defaultValue = extra.defaultValue;
    return col;
  };

  return { uuidPk, timestamps, fk, money, qty };
}

module.exports = { columns };
