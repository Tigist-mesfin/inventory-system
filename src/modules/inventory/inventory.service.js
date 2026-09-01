const crypto = require("crypto");
const { Op } = require("sequelize");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const excel = require("../../shared/helpers/excel.helper");
const inventoryRepository = require("./inventory.repository");
const tenant = require("../../shared/helpers/tenant.helper");
const purchaseOrderService = require("../purchasing/purchase-order.service");
const productService = require("../catalog/product/product.service");
const warehouseService = require("../warehouse/warehouse.service");
const stockBatchService = require("./stock-batch.service");
const inventoryPosting = require("../../shared/services/inventoryPosting.service");
const sequelize = require("../../config/db");
const { Inventory, Product, Warehouse } = require("../../database/models");

const parseImportNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/,/g, "").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
};

const findImportProduct = async (name, user) => {
  const text = String(name || "").trim();
  if (!text) return null;
  const where = { status: "ACTIVE" };
  tenant.applyCompany(where, user);
  const exact = await Product.findOne({ where: { ...where, name: text } });
  if (exact) return exact;
  return Product.findOne({
    where: { ...where, name: { [Op.like]: text } },
  });
};

const resolveImportProduct = async (
  name,
  { sellingPrice, purchasePrice },
  user,
  cache,
) => {
  const text = String(name || "").trim();
  const key = text.toLowerCase();
  if (cache.has(key)) return { product: cache.get(key), created: false };

  const existing = await findImportProduct(text, user);
  if (existing) {
    cache.set(key, existing);
    return { product: existing, created: false };
  }

  const created = await productService.create(
    {
      name: text,
      unit: "PCS",
      purchasePrice: purchasePrice != null ? purchasePrice : 0,
      sellingPrice: sellingPrice != null ? sellingPrice : 0,
    },
    user,
  );
  cache.set(key, created);
  return { product: created, created: true };
};

const listImportWarehouses = async (user) => {
  const where = { status: "ACTIVE" };
  tenant.applyCompany(where, user);
  const rows = await Warehouse.findAll({ where, order: [["name", "ASC"]] });
  return rows.filter((row) => {
    try {
      tenant.assertWarehouseAccess(user, row.id);
      return true;
    } catch {
      return false;
    }
  });
};

const matchWarehouse = (name, warehouses) => {
  const needle = String(name || "")
    .trim()
    .toLowerCase();
  if (!needle) return warehouses[0] || null;
  return (
    warehouses.find((row) => row.name.toLowerCase() === needle) ||
    warehouses.find((row) => row.name.toLowerCase().includes(needle)) ||
    null
  );
};

const resolveImportWarehouse = async (name, user, warehouses, cache) => {
  const text = String(name || "").trim();
  if (!text) {
    return { warehouse: warehouses[0] || null, created: false };
  }

  const key = text.toLowerCase();
  if (cache.has(key)) {
    return { warehouse: cache.get(key), created: false };
  }

  const existing = matchWarehouse(text, warehouses);
  if (existing) {
    cache.set(key, existing);
    return { warehouse: existing, created: false };
  }

  const created = await warehouseService.create({ name: text }, user);
  cache.set(key, created);
  warehouses.push(created);
  return { warehouse: created, created: true };
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query, { defaultLimit: 100, maxLimit: 200 });
  const where = inventoryRepository.buildWhere(query);
  tenant.applyCompany(where, user);
  tenant.applyWarehouse(where, user);
  const productWhere = inventoryRepository.buildProductWhere(query);
  tenant.applyCompany(productWhere, user);
  const { rows, count } = await inventoryRepository.findAndCount({
    where,
    productWhere,
    limit: query.lowStock ? 500 : limit,
    offset: query.lowStock ? 0 : offset,
  });

  const filtered = query.lowStock
    ? rows.filter((row) => row.isLowStock)
    : rows;

  if (query.lowStock) {
    const start = (page - 1) * limit;
    const pageRows = filtered.slice(start, start + limit);
    return paginate.buildResult(
      "inventory",
      pageRows,
      filtered.length,
      page,
      limit,
    );
  }

  return paginate.buildResult("inventory", filtered, count, page, limit);
};

exports.getById = async (id, user) => {
  const row = await inventoryRepository.findById(id);
  tenant.assertOwned(user, row, "Inventory record not found");
  tenant.assertWarehouseAccess(user, row.warehouseId);
  return inventoryRepository.toPublic(row);
};

exports.availableOf = (row) =>
  decimal.available(row.quantity, row.reservedQuantity);

const laterDate = (a, b) => {
  if (!a) return b || null;
  if (!b) return a;
  return String(a) >= String(b) ? a : b;
};

exports.listByItem = async (query, user) => {
  const { page, limit } = paginate(query, { defaultLimit: 200, maxLimit: 500 });
  const where = inventoryRepository.buildWhere(query);
  tenant.applyCompany(where, user);
  tenant.applyWarehouse(where, user);
  const productWhere = inventoryRepository.buildProductWhere(query);
  tenant.applyCompany(productWhere, user);
  const rows = await inventoryRepository.findAllForList({ where, productWhere });

  const grouped = new Map();
  for (const row of rows) {
    if (decimal.cmpQty(row.available, 0) <= 0) continue;
    const productId = row.productId;
    const item = grouped.get(productId) || {
      productId,
      product: row.product,
      quantity: decimal.qty(0),
      storeCount: 0,
      isLowStock: false,
      lastDeliveredAt: null,
      stores: [],
    };
    item.quantity = decimal.addQty(item.quantity, row.available);
    item.lastDeliveredAt = laterDate(item.lastDeliveredAt, row.lastDeliveredAt);
    item.storeCount += 1;
    item.stores.push({
      warehouseId: row.warehouseId,
      name: row.warehouse?.name || "Store",
      quantity: row.available,
      isLowStock: row.isLowStock,
      lastDeliveredAt: row.lastDeliveredAt,
    });
    grouped.set(productId, item);
  }

  let items = [...grouped.values()].map((item) => {
    const reorderLevel = item.product?.reorderLevel ?? 0;
    return {
      ...item,
      isLowStock:
        item.isLowStock ||
        item.stores.some((store) => store.isLowStock) ||
        decimal.cmpQty(item.quantity, reorderLevel) <= 0,
    };
  });

  items.sort((a, b) =>
    String(a.product?.name || "").localeCompare(String(b.product?.name || "")),
  );

  if (query.lowStock) {
    items = items.filter((item) => item.isLowStock);
  }

  const start = (page - 1) * limit;
  return paginate.buildResult(
    "items",
    items.slice(start, start + limit),
    items.length,
    page,
    limit,
  );
};

exports.overview = async (user) => {
  const where = {};
  tenant.applyCompany(where, user);
  tenant.applyWarehouse(where, user);
  const rows = await inventoryRepository.findAllForOverview(where);
  const byStore = new Map();
  let lowStockCount = 0;

  for (const row of rows) {
    const warehouseId = row.warehouseId;
    const name = row.warehouse?.name || "Store";
    if (!byStore.has(warehouseId)) {
      byStore.set(warehouseId, {
        warehouseId,
        name,
        itemCount: 0,
        quantity: decimal.qty(0),
      });
    }
    const store = byStore.get(warehouseId);
    if (decimal.cmpQty(row.available, 0) > 0) {
      store.itemCount += 1;
      store.quantity = decimal.addQty(store.quantity, row.available);
    }
    if (row.isLowStock) lowStockCount += 1;
  }

  const delivery = await purchaseOrderService.undeliveredSummary(user);
  return {
    stores: [...byStore.values()].sort((a, b) => a.name.localeCompare(b.name)),
    lowStockCount,
    undeliveredCount: delivery.undeliveredCount || 0,
    notDeliveredCount: delivery.notDelivered?.count || 0,
  };
};

exports.listUndelivered = async (user) =>
  purchaseOrderService.listUndeliveredItems(user);

exports.adjustOnHand = async (
  { productId, warehouseId, quantity, asCount = false },
  user,
) => {
  tenant.assertWarehouseAccess(user, warehouseId);
  const product = await Product.findByPk(productId);
  tenant.assertOwned(user, product, "Product not found");
  const warehouse = await Warehouse.findByPk(warehouseId);
  tenant.assertOwned(user, warehouse, "Warehouse not found");
  if (warehouse.status !== "ACTIVE") {
    throw AppError.badRequest("Cannot adjust an inactive warehouse");
  }

  const actual = decimal.qty(quantity);
  if (decimal.cmpQty(actual, 0) < 0) {
    throw AppError.badRequest("Quantity cannot be negative");
  }

  return sequelize.transaction(async (transaction) => {
    await purchaseOrderService.lockPendingItemsForProduct(
      productId,
      user,
      transaction,
    );
    const locked = await inventoryPosting.lockInventories(
      [{ productId, warehouseId }],
      transaction,
    );
    const inventory = locked[`${productId}|${warehouseId}`];
    const current = decimal.qty(inventory.quantity);
    const diff = decimal.subQty(actual, current);

    if (decimal.isZeroQty(diff)) {
      return inventoryRepository.toPublic(inventory);
    }

    // Live stock count / Excel import: set on-hand directly.
    // Default UI increase still delivers from undelivered purchases when possible.
    const useCount =
      asCount || decimal.cmpQty(diff, 0) < 0;

    if (!useCount) {
      await purchaseOrderService.deliverQuantityFromPurchases(
        { productId, warehouseId, quantity: diff },
        user,
        transaction,
      );
    } else {
      if (
        decimal.cmpQty(diff, 0) > 0 &&
        decimal.isZeroMoney(inventory.averageCost)
      ) {
        const seedCost = decimal.money(product.purchasePrice || 0);
        if (decimal.cmpMoney(seedCost, 0) > 0) {
          inventory.averageCost = seedCost;
          await inventory.save({ transaction });
        }
      }
      await stockBatchService.adjustToActual(
        { inventory, actualQuantity: actual },
        transaction,
      );
      await inventoryPosting.setOnHandToActual(
        {
          inventory,
          actualQuantity: actual,
          createdBy: user.id,
          referenceType: "STOCK_ADJUSTMENT",
          referenceId: crypto.randomUUID(),
          notes: asCount ? "Stock import" : "Live stock count",
        },
        transaction,
      );
    }

    await inventory.reload({ transaction });
    return inventoryRepository.toPublic(inventory);
  });
};

exports.buildImportTemplate = () => excel.buildStockTemplateBuffer();

exports.importFromExcel = async (buffer, user) => {
  if (!buffer || !buffer.length) {
    throw AppError.badRequest("Upload an Excel file");
  }
  let rows;
  try {
    rows = excel.parseStockRows(buffer);
  } catch {
    throw AppError.badRequest("Could not read that Excel file");
  }
  if (!rows.length) {
    throw AppError.badRequest("The Excel file has no stock rows");
  }
  if (rows.length > 500) {
    throw AppError.badRequest("Import at most 500 rows at a time");
  }

  const warehouses = await listImportWarehouses(user);
  const imported = [];
  const skipped = [];
  const productCache = new Map();
  const warehouseCache = new Map();

  for (const row of rows) {
    try {
      const itemName = String(row.itemName || "").trim();
      if (!itemName) {
        skipped.push({ rowNumber: row.rowNumber, reason: "No item name" });
        continue;
      }

      const quantity = parseImportNumber(row.quantity);
      const sellingPrice = parseImportNumber(row.sellingPrice);
      const purchasePrice = parseImportNumber(row.purchasePrice);
      const hasQty = quantity !== null;
      const hasSell = sellingPrice !== null;
      const hasBuy = purchasePrice !== null;

      if (!hasQty && !hasSell && !hasBuy) {
        skipped.push({
          rowNumber: row.rowNumber,
          reason: "Add quantity, selling price, or last purchase price",
        });
        continue;
      }

      if (hasQty && quantity < 0) {
        skipped.push({
          rowNumber: row.rowNumber,
          reason: "Quantity cannot be negative",
        });
        continue;
      }
      if (hasSell && sellingPrice < 0) {
        skipped.push({
          rowNumber: row.rowNumber,
          reason: "Selling price cannot be negative",
        });
        continue;
      }
      if (hasBuy && purchasePrice < 0) {
        skipped.push({
          rowNumber: row.rowNumber,
          reason: "Last purchase price cannot be negative",
        });
        continue;
      }

      const { warehouse, created: storeCreated } = await resolveImportWarehouse(
        row.store,
        user,
        warehouses,
        warehouseCache,
      );
      if (!warehouse) {
        skipped.push({
          rowNumber: row.rowNumber,
          reason: String(row.store || "").trim()
            ? "Could not create that store"
            : "Add a Store name, or create a store first",
        });
        continue;
      }

      const { product, created } = await resolveImportProduct(
        itemName,
        {
          sellingPrice: hasSell ? sellingPrice : null,
          purchasePrice: hasBuy ? purchasePrice : null,
        },
        user,
        productCache,
      );

      if (hasQty) {
        await exports.adjustOnHand(
          {
            productId: product.id,
            warehouseId: warehouse.id,
            quantity,
            asCount: true,
          },
          user,
        );
      }

      if (!created && (hasSell || hasBuy)) {
        const pricePayload = {};
        if (hasSell) pricePayload.sellingPrice = sellingPrice;
        if (hasBuy) pricePayload.purchasePrice = purchasePrice;
        await productService.update(product.id, pricePayload, user);
      }

      imported.push({
        rowNumber: row.rowNumber,
        itemName: product.name || itemName,
        store: warehouse.name,
        quantity: hasQty ? quantity : null,
        created,
        storeCreated,
      });
    } catch (err) {
      skipped.push({
        rowNumber: row.rowNumber,
        reason:
          err.statusCode && err.message
            ? err.message
            : "Could not import this row",
      });
    }
  }

  return {
    importedCount: imported.length,
    skippedCount: skipped.length,
    imported,
    skipped,
  };
};

exports.listLots = async (query, user) => {
  if (!query.productId || !query.warehouseId) {
    throw AppError.badRequest("Choose an item and a store to view purchase lots");
  }
  tenant.assertWarehouseAccess(user, query.warehouseId);
  const companyId = tenant.requireCompanyId(user);
  const inventory = await Inventory.findOne({
    where: {
      productId: query.productId,
      warehouseId: query.warehouseId,
    },
  });
  if (inventory?.companyId && inventory.companyId !== companyId) {
    throw AppError.notFound("Inventory record not found");
  }
  if (inventory) {
    await sequelize.transaction(async (transaction) => {
      await stockBatchService.backfillStoreLots(inventory, transaction);
    });
  }
  const batches = await stockBatchService.listAvailable({
    productId: query.productId,
    warehouseId: query.warehouseId,
    companyId,
  });
  const purchases = await stockBatchService.listPurchases({
    productId: query.productId,
    warehouseId: query.warehouseId,
    companyId,
  });
  const preview =
    query.quantity != null && query.quantity !== ""
      ? stockBatchService.previewFifo(batches, query.quantity)
      : null;
  return { batches, purchases, preview };
};
