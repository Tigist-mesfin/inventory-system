const { Op } = require("sequelize");
const models = require("../../database/models");
const decimal = require("../../shared/helpers/decimal.helper");

const { Inventory, Product, Warehouse, Category, StockTransaction } = models;

const productInclude = {
  model: Product,
  as: "product",
  attributes: [
    "id",
    "sku",
    "name",
    "brand",
    "size",
    "color",
    "unit",
    "sellingPrice",
    "purchasePrice",
    "reorderLevel",
    "reorderQuantity",
    "status",
    "categoryId",
  ],
  include: [
    { model: Category, as: "category", attributes: ["id", "name"] },
  ],
};

const warehouseInclude = {
  model: Warehouse,
  as: "warehouse",
  attributes: ["id", "name", "code", "status", "address"],
};

const toPublic = (row) => {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  const available = decimal.available(plain.quantity, plain.reservedQuantity);
  const reorderLevel = plain.product?.reorderLevel ?? 0;
  return {
    id: plain.id,
    productId: plain.productId,
    warehouseId: plain.warehouseId,
    quantity: plain.quantity,
    reservedQuantity: plain.reservedQuantity,
    available,
    averageCost: plain.averageCost,
    lastCountedAt: plain.lastCountedAt,
    lastDeliveredAt: plain.lastDeliveredAt || null,
    isLowStock: decimal.cmpQty(available, reorderLevel) <= 0,
    product: plain.product
      ? {
          id: plain.product.id,
          sku: plain.product.sku,
          name: plain.product.name,
          brand: plain.product.brand,
          size: plain.product.size,
          color: plain.product.color,
          unit: plain.product.unit,
          sellingPrice: plain.product.sellingPrice,
          purchasePrice: plain.product.purchasePrice,
          reorderLevel: plain.product.reorderLevel,
          reorderQuantity: plain.product.reorderQuantity,
          status: plain.product.status,
          category: plain.product.category || null,
        }
      : null,
    warehouse: plain.warehouse
      ? {
          id: plain.warehouse.id,
          name: plain.warehouse.name,
          code: plain.warehouse.code,
          status: plain.warehouse.status,
          address: plain.warehouse.address,
        }
      : null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.toPublic = toPublic;

const lastDeliverySql = `(
  SELECT MAX(st.createdAt) FROM stock_transactions AS st
  WHERE st.productId = \`Inventory\`.\`productId\`
    AND st.warehouseId = \`Inventory\`.\`warehouseId\`
    AND st.type = 'PURCHASE'
)`;

const endOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (String(value).length <= 10) date.setHours(23, 59, 59, 999);
  return date;
};

const attachLastDeliveredAt = async (rows) => {
  if (!rows.length) return rows;
  const delivered = await StockTransaction.findAll({
    attributes: [
      "productId",
      "warehouseId",
      [Inventory.sequelize.fn("MAX", Inventory.sequelize.col("createdAt")), "lastDeliveredAt"],
    ],
    where: { type: "PURCHASE" },
    group: ["productId", "warehouseId"],
    raw: true,
  });
  const map = {};
  for (const row of delivered) {
    map[`${row.productId}|${row.warehouseId}`] = row.lastDeliveredAt;
  }
  return rows.map((row) => ({
    ...row,
    lastDeliveredAt: map[`${row.productId}|${row.warehouseId}`] || null,
  }));
};

exports.findAndCount = async ({ where, productWhere, limit, offset }) => {
  const { rows, count } = await Inventory.findAndCountAll({
    where,
    include: [
      {
        ...productInclude,
        where: Object.keys(productWhere).length ? productWhere : undefined,
        required: Object.keys(productWhere).length > 0,
      },
      warehouseInclude,
    ],
    limit,
    offset,
    order: [
      [{ model: Product, as: "product" }, "name", "ASC"],
      [{ model: Warehouse, as: "warehouse" }, "name", "ASC"],
    ],
    distinct: true,
  });
  return { rows: await attachLastDeliveredAt(rows.map(toPublic)), count };
};

exports.findAllForOverview = async (where = {}) => {
  const companyId = where.companyId;
  const rows = await Inventory.findAll({
    where,
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["id", "name", "unit", "reorderLevel"],
        ...(companyId ? { where: { companyId }, required: true } : {}),
      },
      warehouseInclude,
    ],
  });
  return rows.map(toPublic);
};

exports.findAllForList = async ({ where, productWhere }) => {
  const rows = await Inventory.findAll({
    where,
    include: [
      {
        ...productInclude,
        where: Object.keys(productWhere).length ? productWhere : undefined,
        required: Object.keys(productWhere).length > 0,
      },
      warehouseInclude,
    ],
    order: [
      [{ model: Product, as: "product" }, "name", "ASC"],
      [{ model: Warehouse, as: "warehouse" }, "name", "ASC"],
    ],
  });
  return attachLastDeliveredAt(rows.map(toPublic));
};

exports.findById = async (id) =>
  Inventory.findByPk(id, { include: [productInclude, warehouseInclude] });

exports.buildWhere = ({ warehouseId, productId, from, to }) => {
  const where = {};
  if (warehouseId) where.warehouseId = warehouseId;
  if (productId) where.productId = productId;
  if (from || to) {
    const clauses = [];
    if (from) {
      clauses.push(
        Inventory.sequelize.where(Inventory.sequelize.literal(lastDeliverySql), {
          [Op.gte]: from,
        }),
      );
    }
    if (to) {
      clauses.push(
        Inventory.sequelize.where(Inventory.sequelize.literal(lastDeliverySql), {
          [Op.lte]: endOfDay(to),
        }),
      );
    }
    where[Op.and] = clauses;
  }
  return where;
};

exports.buildProductWhere = ({ search, brand, size, color }) => {
  const where = {};
  if (brand) where.brand = { [Op.like]: `%${brand}%` };
  if (size) where.size = { [Op.like]: `%${size}%` };
  if (color) where.color = { [Op.like]: `%${color}%` };
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [
      { name: like },
      { sku: like },
      { barcode: like },
      { brand: like },
      { size: like },
      { color: like },
    ];
  }
  return where;
};
