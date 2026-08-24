const AppError = require("../../../shared/errors/AppError");
const paginate = require("../../../shared/helpers/pagination.helper");
const productRepository = require("./product.repository");
const categoryRepository = require("../category/category.repository");
const supplierRepository = require("../supplier/supplier.repository");

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const assertCategory = async (categoryId) => {
  const category = await categoryRepository.findById(categoryId);
  if (!category) throw AppError.badRequest("Category not found");
  if (category.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot assign an inactive category");
  }
  return category;
};

const assertSupplier = async (supplierId) => {
  if (!supplierId) return null;
  const supplier = await supplierRepository.findById(supplierId);
  if (!supplier) throw AppError.badRequest("Supplier not found");
  if (supplier.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot assign an inactive supplier");
  }
  return supplier;
};

const assertUniqueSku = async (sku, excludeId) => {
  const existing = await productRepository.findBySku(sku);
  if (existing && existing.id !== excludeId) {
    throw AppError.conflict("sku is already in use");
  }
};

const assertUniqueBarcode = async (barcode, excludeId) => {
  if (!barcode) return;
  const existing = await productRepository.findByBarcode(barcode);
  if (existing && existing.id !== excludeId) {
    throw AppError.conflict("barcode is already in use");
  }
};

exports.list = async (query) => {
  const { page, limit, offset } = paginate(query);
  const where = productRepository.searchWhere(query);
  const { rows, count } = await productRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("products", rows, count, page, limit);
};

exports.getById = async (id) => {
  const product = await productRepository.findById(id);
  if (!product) throw AppError.notFound("Product not found");
  return productRepository.toPublic(product);
};

exports.create = async (payload) => {
  await assertCategory(payload.categoryId);
  await assertSupplier(payload.supplierId || null);
  await assertUniqueSku(payload.sku);
  await assertUniqueBarcode(emptyToNull(payload.barcode));

  const product = await productRepository.create({
    categoryId: payload.categoryId,
    supplierId: payload.supplierId || null,
    sku: payload.sku,
    barcode: emptyToNull(payload.barcode) ?? null,
    name: payload.name,
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

  return productRepository.toPublic(product);
};

exports.update = async (id, payload) => {
  const product = await productRepository.findById(id);
  if (!product) throw AppError.notFound("Product not found");

  if (payload.categoryId && payload.categoryId !== product.categoryId) {
    await assertCategory(payload.categoryId);
    product.categoryId = payload.categoryId;
  }

  if (payload.supplierId !== undefined) {
    await assertSupplier(payload.supplierId);
    product.supplierId = payload.supplierId || null;
  }

  if (payload.sku && payload.sku !== product.sku) {
    await assertUniqueSku(payload.sku, product.id);
    product.sku = payload.sku;
  }

  if (payload.barcode !== undefined) {
    const barcode = emptyToNull(payload.barcode);
    await assertUniqueBarcode(barcode, product.id);
    product.barcode = barcode;
  }

  if (payload.name !== undefined) product.name = payload.name;
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
  return productRepository.toPublic(saved);
};

exports.remove = async (id) => {
  const product = await productRepository.findById(id);
  if (!product) throw AppError.notFound("Product not found");

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
