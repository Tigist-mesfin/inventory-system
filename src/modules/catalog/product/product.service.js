const AppError = require("../../../shared/errors/AppError");
const paginate = require("../../../shared/helpers/pagination.helper");
const decimal = require("../../../shared/helpers/decimal.helper");
const productRepository = require("./product.repository");
const tenant = require("../../../shared/helpers/tenant.helper");
const categoryRepository = require("../category/category.repository");
const supplierRepository = require("../supplier/supplier.repository");

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const ensureGeneralCategory = async (user) => {
  const companyId = tenant.companyIdOf(user);
  let category = await categoryRepository.findByName("General", companyId);
  if (!category) {
    category = await categoryRepository.create({
      name: "General",
      status: "ACTIVE",
      companyId,
    });
  }
  return category;
};

const assertCategory = async (categoryId, user) => {
  const category = await categoryRepository.findById(categoryId);
  tenant.assertOwned(user, category, "Category not found");
  if (category.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot assign an inactive category");
  }
  return category;
};

const assertSupplier = async (supplierId, user) => {
  if (!supplierId) return null;
  const supplier = await supplierRepository.findById(supplierId);
  tenant.assertOwned(user, supplier, "Supplier not found");
  if (supplier.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot assign an inactive supplier");
  }
  return supplier;
};

const assertUniqueSku = async (sku, excludeId, companyId) => {
  const existing = await productRepository.findBySku(sku, companyId);
  if (existing && existing.id !== excludeId) {
    throw AppError.conflict("sku is already in use");
  }
};

const assertUniqueBarcode = async (barcode, excludeId, companyId) => {
  if (!barcode) return;
  const existing = await productRepository.findByBarcode(barcode, companyId);
  if (existing && existing.id !== excludeId) {
    throw AppError.conflict("barcode is already in use");
  }
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = productRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  const { rows, count } = await productRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("products", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const product = await productRepository.findById(id);
  tenant.assertOwned(user, product, "Product not found");
  return productRepository.toPublic(product);
};

const generateSku = (name) => {
  const base = String(name || "ITEM")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18) || "ITEM";
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
};

const resolveSkuAndSerial = async (payload, excludeId, companyId) => {
  const serial = emptyToNull(payload.serialNumber) || emptyToNull(payload.barcode);
  let sku = emptyToNull(payload.sku);
  if (!sku && serial) {
    const taken = await productRepository.findBySku(serial, companyId);
    if (!taken || taken.id === excludeId) sku = serial;
  }
  if (!sku) sku = generateSku(payload.name);
  await assertUniqueSku(sku, excludeId, companyId);
  await assertUniqueBarcode(serial, excludeId, companyId);
  return { sku, barcode: serial };
};

exports.create = async (payload, user) => {
  const categoryId =
    payload.categoryId || (await ensureGeneralCategory(user)).id;
  await assertCategory(categoryId, user);
  await assertSupplier(payload.supplierId || null, user);
  const { sku, barcode } = await resolveSkuAndSerial(
    payload,
    null,
    tenant.companyIdOf(user),
  );

  const product = await productRepository.create({
    categoryId,
    supplierId: payload.supplierId || null,
    companyId: tenant.companyIdOf(user),
    sku,
    barcode,
    name: payload.name,
    brand: emptyToNull(payload.brand) ?? null,
    size: emptyToNull(payload.size) ?? null,
    color: emptyToNull(payload.color) ?? null,
    description: emptyToNull(payload.description) ?? null,
    unit: payload.unit || "PCS",
    purchasePrice: payload.purchasePrice ?? 0,
    sellingPrice: payload.sellingPrice ?? 0,
    reorderLevel: payload.reorderLevel ?? 0,
    reorderQuantity: payload.reorderQuantity ?? 0,
    trackBatch: payload.trackBatch ?? false,
    trackExpiry: payload.trackExpiry ?? false,
    status: payload.status || "ACTIVE",
  });

  if (user?.id) {
    await productRepository.recordPriceHistory({
      productId: product.id,
      changedBy: user.id,
      companyId: tenant.companyIdOf(user),
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      note: "Initial list price",
    });
  }

  return productRepository.toPublic(product);
};

exports.priceHistory = async (id, user) => {
  const product = await productRepository.findById(id);
  tenant.assertOwned(user, product, "Product not found");
  return productRepository.listPriceHistory(id);
};

exports.update = async (id, payload, user) => {
  const product = await productRepository.findById(id);
  tenant.assertOwned(user, product, "Product not found");
  const companyId = tenant.companyIdOf(user);

  const previousPurchase = decimal.money(product.purchasePrice);
  const previousSelling = decimal.money(product.sellingPrice);

  if (payload.categoryId && payload.categoryId !== product.categoryId) {
    await assertCategory(payload.categoryId, user);
    product.categoryId = payload.categoryId;
  }

  if (payload.supplierId !== undefined) {
    await assertSupplier(payload.supplierId, user);
    product.supplierId = payload.supplierId || null;
  }

  if (payload.sku && payload.sku !== product.sku) {
    await assertUniqueSku(payload.sku, product.id, companyId);
    product.sku = payload.sku;
  }

  if (payload.barcode !== undefined || payload.serialNumber !== undefined) {
    const barcode = emptyToNull(payload.serialNumber !== undefined ? payload.serialNumber : payload.barcode);
    await assertUniqueBarcode(barcode, product.id, companyId);
    product.barcode = barcode;
  }

  if (payload.name !== undefined) product.name = payload.name;
  if (payload.brand !== undefined) product.brand = emptyToNull(payload.brand);
  if (payload.size !== undefined) product.size = emptyToNull(payload.size);
  if (payload.color !== undefined) product.color = emptyToNull(payload.color);
  if (payload.description !== undefined) {
    product.description = emptyToNull(payload.description);
  }
  if (payload.unit !== undefined) product.unit = payload.unit;
  if (payload.purchasePrice !== undefined) {
    product.purchasePrice = payload.purchasePrice;
  }
  if (payload.sellingPrice !== undefined) {
    product.sellingPrice = payload.sellingPrice;
  }
  if (payload.reorderLevel !== undefined) {
    product.reorderLevel = payload.reorderLevel;
  }
  if (payload.reorderQuantity !== undefined) {
    product.reorderQuantity = payload.reorderQuantity;
  }
  if (payload.trackBatch !== undefined) product.trackBatch = payload.trackBatch;
  if (payload.trackExpiry !== undefined) product.trackExpiry = payload.trackExpiry;
  if (payload.status !== undefined) product.status = payload.status;

  const saved = await productRepository.save(product);
  const nextPurchase = decimal.money(saved.purchasePrice);
  const nextSelling = decimal.money(saved.sellingPrice);
  if (
    user?.id &&
    (decimal.cmpMoney(previousPurchase, nextPurchase) !== 0 ||
      decimal.cmpMoney(previousSelling, nextSelling) !== 0)
  ) {
    await productRepository.recordPriceHistory({
      productId: saved.id,
      changedBy: user.id,
      companyId: tenant.companyIdOf(user),
      purchasePrice: nextPurchase,
      sellingPrice: nextSelling,
      note: "List price updated",
    });
  }

  return productRepository.toPublic(saved);
};

exports.remove = async (id, user) => {
  const product = await productRepository.findById(id);
  tenant.assertOwned(user, product, "Product not found");

  const refs = await productRepository.countOperationalReferences(id);
  const total = Object.values(refs).reduce((sum, n) => sum + n, 0);
  if (total > 0) {
    throw AppError.conflict(
      "Product is referenced by operational records and cannot be deleted; deactivate it instead",
    );
  }

  try {
    await productRepository.destroy(product);
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      throw AppError.conflict(
        "Product is referenced by operational records and cannot be deleted; deactivate it instead",
      );
    }
    throw err;
  }

  return { deleted: true };
};
