const { Op } = require("sequelize");
const models = require("../../database/models");

const { Warehouse, Inventory, Sale, StockReceipt, StockTransfer } = models;

const toPublic = (warehouse) => {
  if (!warehouse) return null;
  const plain =
    typeof warehouse.toJSON === "function"
      ? warehouse.toJSON()
      : { ...warehouse };
  return {
    id: plain.id,
    name: plain.name,
    code: plain.code,
    address: plain.address,
    managerName: plain.managerName,
    phone: plain.phone,
    status: plain.status,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.toPublic = toPublic;

exports.searchWhere = ({ search, status }) => {
  const where = {};
  if (status) where.status = status;
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [{ name: like }, { code: like }, { managerName: like }];
  }
  return where;
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await Warehouse.findAndCountAll({
    where,
    limit,
    offset,
    order: [["name", "ASC"]],
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id) => Warehouse.findByPk(id);

exports.findByName = async (name, companyId) =>
  Warehouse.findOne({ where: { name, ...(companyId ? { companyId } : {}) } });

exports.findByCode = async (code, companyId) =>
  Warehouse.findOne({ where: { code, ...(companyId ? { companyId } : {}) } });

exports.create = async (payload) => Warehouse.create(payload);

exports.save = async (warehouse) => {
  await warehouse.save();
  return warehouse;
};

exports.destroy = async (warehouse) => warehouse.destroy();

exports.countOperationalReferences = async (warehouseId) => {
  const [inventory, sales, receipts, outgoing, incoming] = await Promise.all([
    Inventory.count({ where: { warehouseId } }),
    Sale.count({ where: { warehouseId } }),
    StockReceipt.count({ where: { warehouseId } }),
    StockTransfer.count({ where: { sourceWarehouseId: warehouseId } }),
    StockTransfer.count({ where: { destinationWarehouseId: warehouseId } }),
  ]);
  return { inventory, sales, receipts, outgoing, incoming };
};
