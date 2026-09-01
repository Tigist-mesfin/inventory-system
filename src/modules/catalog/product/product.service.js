const AppError = require("../../../shared/errors/AppError");
const paginate = require("../../../shared/helpers/pagination.helper");
const decimal = require("../../../shared/helpers/decimal.helper");
const productRepository = require("./product.repository");
const tenant = require("../../../shared/helpers/tenant.helper");
const categoryRepository = require("../category/category.repository");
const supplierRepository = require("../supplier/supplier.repository");
const models = require("../../../database/models");
const { Op } = require("sequelize");
const stockBatchService = require("../../inventory/stock-batch.service");

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

const dateKey = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

exports.history = async (id, query, user) => {
  const product = await productRepository.findById(id);
  tenant.assertOwned(user, product, "Product not found");

  const {
    PurchaseOrderItem,
    PurchaseOrder,
    Supplier,
    Warehouse,
    SaleItem,
    Sale,
    Customer,
    User,
    StockTransaction,
    StockBatch,
    SaleCostAllocation,
  } = models;

  const purchaseWhere = { productId: id };
  if (query.warehouseId) {
    purchaseWhere[Op.or] = [
      { warehouseId: query.warehouseId },
      { warehouseId: null },
    ];
  }
  const poWhere = { status: { [Op.ne]: "CANCELLED" } };
  tenant.applyCompany(poWhere, user);
  if (query.from || query.to) {
    poWhere.orderDate = {};
    if (query.from) poWhere.orderDate[Op.gte] = query.from;
    if (query.to) poWhere.orderDate[Op.lte] = query.to;
  }
  if (query.supplierId) poWhere.supplierId = query.supplierId;

  const purchaseRows = await PurchaseOrderItem.findAll({
    where: purchaseWhere,
    include: [
      {
        model: PurchaseOrder,
        as: "purchaseOrder",
        required: true,
        where: poWhere,
        include: [
          { model: Supplier, as: "supplier", attributes: ["id", "name"] },
          { model: User, as: "creator", attributes: ["id", "fullName", "username"] },
        ],
      },
      { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"], required: false },
      {
        model: StockBatch,
        as: "stockBatches",
        required: false,
        include: [
          {
            model: SaleCostAllocation,
            as: "costAllocations",
            attributes: ["id", "quantity"],
            required: false,
          },
        ],
      },
    ],
    order: [[{ model: PurchaseOrder, as: "purchaseOrder" }, "orderDate", "DESC"]],
  });

  const purchases = purchaseRows
    .filter((row) => {
      if (query.unitCost == null || query.unitCost === "") return true;
      return decimal.cmpMoney(row.unitPrice, query.unitCost) === 0;
    })
    .map((row) => {
      const plain = row.toJSON();
      const batches = plain.stockBatches || [];
      const remainingQuantity = batches.reduce(
        (sum, batch) => decimal.addQty(sum, batch.remainingQuantity || 0),
        decimal.qty(0),
      );
      const soldQuantity = batches.reduce(
        (sum, batch) =>
          decimal.addQty(
            sum,
            (batch.costAllocations || []).reduce(
              (inner, alloc) => decimal.addQty(inner, alloc.quantity || 0),
              decimal.qty(0),
            ),
          ),
        decimal.qty(0),
      );
      return {
        id: plain.id,
        purchaseOrderId: plain.purchaseOrderId,
        purchaseOrderItemId: plain.id,
        date: dateKey(plain.purchaseOrder.orderDate),
        document: plain.purchaseOrder.orderNumber,
        supplier: plain.purchaseOrder.supplier?.name || "Walk-in",
        supplierId: plain.purchaseOrder.supplierId,
        store: plain.warehouse?.name || "Not delivered",
        warehouseId: plain.warehouseId,
        quantity: plain.quantity,
        receivedQuantity: plain.receivedQuantity,
        unitCost: plain.unitPrice,
        totalCost: plain.totalPrice,
        remainingQuantity,
        soldQuantity,
        deliveryStatus: plain.deliveryStatus,
        createdBy: plain.purchaseOrder.creator?.fullName || null,
        batches: batches.map((batch) => stockBatchService.toPublicBatch(batch)),
      };
    });

  const saleWhere = { status: "COMPLETED" };
  tenant.applyCompany(saleWhere, user);
  tenant.applyWarehouse(saleWhere, user);
  if (query.warehouseId) saleWhere.warehouseId = query.warehouseId;
  if (query.customerId) saleWhere.customerId = query.customerId;
  if (query.createdBy) saleWhere.createdBy = query.createdBy;
  if (query.from || query.to) {
    saleWhere.saleDate = {};
    if (query.from) saleWhere.saleDate[Op.gte] = query.from;
    if (query.to) {
      const to = new Date(query.to);
      if (String(query.to).length <= 10) to.setHours(23, 59, 59, 999);
      saleWhere.saleDate[Op.lte] = to;
    }
  }

  const saleRows = await SaleItem.findAll({
    where: { productId: id },
    include: [
      {
        model: Sale,
        as: "sale",
        required: true,
        where: saleWhere,
        include: [
          { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
          { model: User, as: "creator", attributes: ["id", "fullName", "username"] },
          { model: Customer, as: "customer", attributes: ["id", "name"], required: false },
        ],
      },
      {
        model: SaleCostAllocation,
        as: "costAllocations",
        required: false,
        include: [
          {
            model: StockBatch,
            as: "stockBatch",
            attributes: ["id", "purchaseDate", "unitCost", "sourceType"],
          },
        ],
      },
    ],
    order: [[{ model: Sale, as: "sale" }, "saleDate", "DESC"]],
  });

  const sales = saleRows
    .filter((row) => {
      if (query.sellingPrice == null || query.sellingPrice === "") return true;
      return decimal.cmpMoney(row.unitPrice, query.sellingPrice) === 0;
    })
    .map((row) => {
      const plain = row.toJSON();
      const allocs = plain.costAllocations || [];
      const purchaseCost = allocs.length
        ? allocs.reduce(
            (sum, alloc) => decimal.addMoney(sum, alloc.totalCost),
            decimal.money(0),
          )
        : decimal.lineTotal(plain.quantity, 0, 0);
      const revenue = decimal.money(plain.totalPrice);
      const profit = decimal.subMoney(revenue, purchaseCost);
      return {
        id: plain.id,
        saleId: plain.sale.id,
        date: dateKey(plain.sale.saleDate),
        document: plain.sale.invoiceNumber,
        customer: plain.sale.customer?.name || plain.sale.customerName || "Walk-in",
        store: plain.sale.warehouse?.name,
        warehouseId: plain.sale.warehouseId,
        salesperson: plain.sale.creator?.fullName || plain.sale.creator?.username,
        quantity: plain.quantity,
        sellingPrice: plain.unitPrice,
        totalSaleAmount: revenue,
        purchaseCost,
        profit,
        allocations: allocs.map((alloc) => ({
          stockBatchId: alloc.stockBatchId,
          quantity: alloc.quantity,
          unitCost: alloc.unitCost,
          totalCost: alloc.totalCost,
          purchaseDate: alloc.stockBatch?.purchaseDate || null,
          costingMethod: alloc.costingMethod,
        })),
      };
    });

  const txWhere = { productId: id };
  tenant.applyCompany(txWhere, user);
  tenant.applyWarehouse(txWhere, user);
  if (query.warehouseId) txWhere.warehouseId = query.warehouseId;
  if (query.from || query.to) {
    txWhere.createdAt = {};
    if (query.from) txWhere.createdAt[Op.gte] = query.from;
    if (query.to) txWhere.createdAt[Op.lte] = query.to;
  }
  const txRows = await StockTransaction.findAll({
    where: txWhere,
    include: [
      { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
      { model: User, as: "creator", attributes: ["id", "fullName", "username"] },
    ],
    order: [["createdAt", "DESC"]],
    limit: 200,
  });

  const saleIds = [
    ...new Set(
      txRows
        .filter((row) => row.type === "SALE" && row.referenceType === "SALE")
        .map((row) => row.referenceId),
    ),
  ];
  const allocBySale = {};
  if (saleIds.length) {
    const allocs = await SaleCostAllocation.findAll({
      where: { saleId: { [Op.in]: saleIds }, saleItemId: { [Op.ne]: null } },
      include: [
        {
          model: SaleItem,
          as: "saleItem",
          attributes: ["productId"],
          required: true,
          where: { productId: id },
        },
        {
          model: StockBatch,
          as: "stockBatch",
          attributes: ["id", "purchaseDate", "unitCost", "sourceType"],
        },
      ],
    });
    for (const alloc of allocs) {
      const list = allocBySale[alloc.saleId] || [];
      list.push(alloc);
      allocBySale[alloc.saleId] = list;
    }
  }

  const stock = txRows.flatMap((row) => {
    const plain = row.toJSON();
    const inbound = !String(plain.type).includes("OUT") && plain.type !== "SALE";
    const base = {
      id: plain.id,
      date: dateKey(plain.createdAt),
      type: plain.type,
      quantity: inbound ? `+${plain.quantity}` : `-${plain.quantity}`,
      unitCost: plain.unitCost,
      store: plain.warehouse?.name,
      notes: plain.notes,
      createdAt: plain.createdAt,
    };
    const allocs = allocBySale[plain.referenceId] || [];
    if (plain.type === "SALE" && allocs.length) {
      return allocs.map((alloc) => ({
        ...base,
        quantity: `-${alloc.quantity}`,
        unitCost: alloc.unitCost,
        fromPurchase: alloc.stockBatch?.purchaseDate
          ? dateKey(alloc.stockBatch.purchaseDate)
          : null,
      }));
    }
    return [base];
  });

  return {
    product: productRepository.toPublic(product),
    purchases,
    sales,
    stock,
  };
};
