const { QueryTypes } = require("sequelize");
const sequelize = require("../../config/db");

exports.run = (sql, replacements) =>
  sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

exports.wh = (column, warehouseIds, replacements) => {
  if (warehouseIds === null || warehouseIds === undefined) return "1=1";
  if (!warehouseIds.length) return "1=0";
  replacements.whIds = warehouseIds;
  return `${column} IN (:whIds)`;
};
