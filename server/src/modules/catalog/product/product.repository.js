const { Op } = require("sequelize");
const models = require("../../../database/models");

const {
  Product,
  Category,
  Supplier,
  Inventory,
  StockTransaction,
  StockTransferItem,
  StockAdjustmentItem,
  PurchaseOrderItem,
  StockReceiptItem,
  SaleItem,
  PriceHistory,
  User,
} = models;

const include = [
  { model: Category, as: "category", attributes: ["id", "name", "status"] },
  { model: Supplier, as: "supplier", attributes: ["id", "name", "status"] },
];

const toPublic = (product) => {
  if (!product) return null;
  const plain =
    typeof product.toJSON === "function" ? product.toJSON() : { ...product };

  return {
    id: plain.id,
    categoryId: plain.categoryId,
    supplierId: plain.supplierId,
    sku: plain.sku,
    barcode: plain.barcode,
    name: plain.name,
    brand: plain.brand,
    size: plain.size,
    color: plain.color,
    description: plain.description,
    unit: plain.unit,
    purchasePrice: plain.purchasePrice,
    sellingPrice: plain.sellingPrice,
    reorderLevel: plain.reorderLevel,
    reorderQuantity: plain.reorderQuantity,
    trackBatch: Boolean(plain.trackBatch),
    trackExpiry: Boolean(plain.trackExpiry),
    status: plain.status,
    category: plain.category
      ? {
          id: plain.category.id,
          name: plain.category.name,
          status: plain.category.status,
        }
      : null,
    supplier: plain.supplier
      ? {
          id: plain.supplier.id,
          name: plain.supplier.name,
          status: plain.supplier.status,
        }
      : null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

exports.toPublic = toPublic;

exports.searchWhere = ({
  search,
  status,
  categoryId,
  supplierId,
  brand,
  size,
  color,
}) => {
  const where = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (supplierId) where.supplierId = supplierId;
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

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await Product.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [["name", "ASC"]],
    distinct: true,
  });
  return { rows: rows.map(toPublic), count };
};

exports.findById = async (id) => Product.findByPk(id, { include });

exports.findBySku = async (sku, companyId) =>
  Product.findOne({ where: { sku, ...(companyId ? { companyId } : {}) } });

exports.findByBarcode = async (barcode, companyId) =>
  Product.findOne({
    where: { barcode, ...(companyId ? { companyId } : {}) },
  });

exports.create = async (payload) => {
  const created = await Product.create(payload);
  return Product.findByPk(created.id, { include });
};

exports.save = async (product) => {
  await product.save();
  return Product.findByPk(product.id, { include });
};

exports.destroy = async (product) => product.destroy();

exports.recordPriceHistory = async ({
  productId,
  changedBy,
  companyId,
  purchasePrice,
  sellingPrice,
  note,
}) =>
  PriceHistory.create({
    productId,
    changedBy,
    companyId: companyId || null,
    purchasePrice,
    sellingPrice,
    note: note || null,
  });

exports.listPriceHistory = async (productId) => {
  const rows = await PriceHistory.findAll({
    where: { productId },
    include: [
      { model: User, as: "changer", attributes: ["id", "fullName", "username"] },
    ],
    order: [["createdAt", "DESC"]],
    limit: 100,
  });
  return rows.map((row) => {
    const plain = row.toJSON();
    return {
      id: plain.id,
      purchasePrice: plain.purchasePrice,
      sellingPrice: plain.sellingPrice,
      note: plain.note,
      changedBy: plain.changer
        ? {
            id: plain.changer.id,
            fullName: plain.changer.fullName,
            username: plain.changer.username,
          }
        : null,
      createdAt: plain.createdAt,
    };
  });
};

exports.countOperationalReferences = async (productId) => {
  const [
    inventory,
    stockTransactions,
    stockTransferItems,
    stockAdjustmentItems,
    purchaseOrderItems,
    stockReceiptItems,
    saleItems,
  ] = await Promise.all([
    Inventory.count({ where: { productId } }),
    StockTransaction.count({ where: { productId } }),
    StockTransferItem.count({ where: { productId } }),
    StockAdjustmentItem.count({ where: { productId } }),
    PurchaseOrderItem.count({ where: { productId } }),
    StockReceiptItem.count({ where: { productId } }),
    SaleItem.count({ where: { productId } }),
  ]);

  return {
    inventory,
    stockTransactions,
    stockTransferItems,
    stockAdjustmentItems,
    purchaseOrderItems,
    stockReceiptItems,
    saleItems,
  };
};
