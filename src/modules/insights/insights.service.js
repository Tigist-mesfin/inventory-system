const { Op, fn, col, literal, QueryTypes } = require("sequelize");
const models = require("../../database/models");
const decimal = require("../../shared/helpers/decimal.helper");
const tenant = require("../../shared/helpers/tenant.helper");
const paginate = require("../../shared/helpers/pagination.helper");
const sequelize = require("../../config/db");
const vat = require("../../shared/helpers/vat.helper");

const {
  Sale,
  SaleItem,
  Product,
  Inventory,
  Warehouse,
  Customer,
  PurchaseOrder,
  PurchaseOrderItem,
  User,
  Category,
  Supplier,
  StockTransaction,
  SaleCostAllocation,
} = models;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const sumMoney = (rows, field) =>
  rows.reduce((sum, row) => decimal.addMoney(sum, row[field] || 0), decimal.money(0));

const grossProfitOf = async (sales) => {
  const revenue = sales.reduce(
    (sum, sale) => decimal.addMoney(sum, sale.subtotal || sale.totalAmount),
    decimal.money(0),
  );
  if (!sales.length) return decimal.money(0);
  const txs = await StockTransaction.findAll({
    where: {
      type: "SALE",
      referenceType: "SALE",
      referenceId: { [Op.in]: sales.map((sale) => sale.id) },
    },
    attributes: ["quantity", "unitCost"],
  });
  const cogs = txs.reduce(
    (sum, tx) =>
      decimal.addMoney(sum, decimal.lineTotal(tx.quantity, tx.unitCost || 0)),
    decimal.money(0),
  );
  return decimal.subMoney(revenue, cogs);
};

exports.dashboard = async (user) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = addDays(todayStart, -6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const completedWhere = { status: "COMPLETED" };
  tenant.applyCompany(completedWhere, user);
  tenant.applyWarehouse(completedWhere, user);

  const [todaySales, weekSales, monthSales, allCompleted] = await Promise.all([
    Sale.findAll({
      where: { ...completedWhere, saleDate: { [Op.gte]: todayStart } },
    }),
    Sale.findAll({
      where: { ...completedWhere, saleDate: { [Op.gte]: weekStart } },
    }),
    Sale.findAll({
      where: { ...completedWhere, saleDate: { [Op.gte]: monthStart } },
    }),
    Sale.findAll({ where: completedWhere, attributes: ["id", "totalAmount", "paidAmount", "paymentMethod", "dueDate", "customerId", "createdBy", "saleDate"] }),
  ]);

  const sumSales = (rows) =>
    rows.reduce((sum, row) => decimal.addMoney(sum, row.totalAmount), decimal.money(0));

  const bestSellers = await SaleItem.findAll({
    attributes: [
      "productId",
      [fn("SUM", col("quantity")), "soldQuantity"],
      [fn("SUM", col("totalPrice")), "soldAmount"],
    ],
    include: [
      {
        model: Sale,
        as: "sale",
        attributes: [],
        where: completedWhere,
      },
      {
        model: Product,
        as: "product",
        attributes: ["id", "sku", "name", "brand", "size", "color"],
      },
    ],
    group: ["SaleItem.productId", "product.id"],
    order: [[literal("soldQuantity"), "DESC"]],
    limit: 8,
  });

  const inventoryWhere = {};
  tenant.applyCompany(inventoryWhere, user);
  tenant.applyWarehouse(inventoryWhere, user);
  const inventoryRows = await Inventory.findAll({
    where: inventoryWhere,
    include: [
      {
        model: Product,
        as: "product",
        required: true,
        where: tenant.applyCompany({}, user),
        attributes: [
          "id",
          "sku",
          "name",
          "brand",
          "size",
          "color",
          "reorderLevel",
          "sellingPrice",
        ],
      },
      { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
    ],
  });

  const lowStock = inventoryRows
    .map((row) => {
      const plain = row.toJSON();
      const available = decimal.available(plain.quantity, plain.reservedQuantity);
      return {
        ...plain,
        available,
        isLowStock: decimal.cmpQty(available, plain.product?.reorderLevel || 0) <= 0,
      };
    })
    .filter((row) => row.isLowStock && decimal.cmpQty(row.available, 0) >= 0)
    .slice(0, 12);

  const cutoff = addDays(now, -90);
  const recentSaleItems = await SaleItem.findAll({
    attributes: ["productId"],
    include: [
      {
        model: Sale,
        as: "sale",
        attributes: [],
        where: { ...completedWhere, saleDate: { [Op.gte]: cutoff } },
      },
    ],
    group: ["productId"],
  });
  const movingIds = new Set(recentSaleItems.map((r) => r.productId));
  const deadStock = inventoryRows
    .filter((row) => {
      const available = decimal.available(row.quantity, row.reservedQuantity);
      return decimal.cmpQty(available, 0) > 0 && !movingIds.has(row.productId);
    })
    .slice(0, 12)
    .map((row) => {
      const plain = row.toJSON();
      return {
        ...plain,
        available: decimal.available(plain.quantity, plain.reservedQuantity),
        recommendation: "Discount or transfer this slow-moving SKU",
      };
    });

  const overdueCredit = allCompleted.filter(
    (sale) =>
      sale.paymentMethod === "CREDIT" &&
      sale.dueDate &&
      new Date(sale.dueDate) < now &&
      decimal.cmpMoney(decimal.subMoney(sale.totalAmount, sale.paidAmount), 0) > 0,
  );

  const creditOutstanding = allCompleted
    .filter((s) => s.paymentMethod === "CREDIT")
    .reduce(
      (sum, sale) =>
        decimal.addMoney(sum, decimal.subMoney(sale.totalAmount, sale.paidAmount)),
      decimal.money(0),
    );

  const posWhere = { status: { [Op.in]: ["APPROVED", "PARTIALLY_RECEIVED", "COMPLETED"] } };
  tenant.applyCompany(posWhere, user);
  const canSeePurchasing =
    tenant.isOwner(user) || tenant.hasPermission(user, "purchasing", "READ");
  const pos = canSeePurchasing
    ? await PurchaseOrder.findAll({ where: posWhere })
    : [];
  const supplierPayables = pos.reduce(
    (sum, po) => decimal.addMoney(sum, decimal.subMoney(po.totalAmount, po.paidAmount || 0)),
    decimal.money(0),
  );

  const salespersonMap = new Map();
  for (const sale of allCompleted) {
    const current = salespersonMap.get(sale.createdBy) || {
      userId: sale.createdBy,
      invoiceCount: 0,
      totalAmount: decimal.money(0),
    };
    current.invoiceCount += 1;
    current.totalAmount = decimal.addMoney(current.totalAmount, sale.totalAmount);
    salespersonMap.set(sale.createdBy, current);
  }
  const users = await User.findAll({
    where: { id: [...salespersonMap.keys()] },
    attributes: ["id", "fullName", "username"],
  });
  const salespersonPerformance = users.map((user) => ({
    user: { id: user.id, fullName: user.fullName, username: user.username },
    ...salespersonMap.get(user.id),
  }));

  const followUpWhere = { status: "ACTIVE" };
  tenant.applyCompany(followUpWhere, user);
  const followUps = await Customer.findAll({
    where: followUpWhere,
    limit: 200,
  });
  const followUpCutoff = addDays(now, -30);
  const followUpCustomers = [];
  for (const customer of followUps) {
    const last = await Sale.findOne({
      where: {
        customerId: customer.id,
        status: "COMPLETED",
        ...tenant.applyCompany({}, user),
      },
      order: [["saleDate", "DESC"]],
    });
    if (!last || new Date(last.saleDate) < followUpCutoff) {
      followUpCustomers.push({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        businessName: customer.businessName,
        lastPurchaseAt: last ? last.saleDate : null,
      });
    }
    if (followUpCustomers.length >= 8) break;
  }

  const warehouseWhere = { status: "ACTIVE" };
  tenant.applyCompany(warehouseWhere, user);
  tenant.applyWarehouse(warehouseWhere, user, "id");
  const purchaseWhere = { status: { [Op.ne]: "CANCELLED" } };
  tenant.applyCompany(purchaseWhere, user);
  const recentProductWhere = { createdAt: { [Op.gte]: weekStart } };
  tenant.applyCompany(recentProductWhere, user);

  const [warehouses, weekPurchasesRaw, recentProducts, grossProfitToday, grossProfitWeek] =
    await Promise.all([
      Warehouse.findAll({
        where: warehouseWhere,
        attributes: ["id", "name", "code"],
        order: [["name", "ASC"]],
      }),
      canSeePurchasing
        ? PurchaseOrder.findAll({
            where: { ...purchaseWhere, orderDate: { [Op.gte]: weekStart } },
            include: [{ model: Supplier, as: "supplier", attributes: ["id", "name"] }],
            order: [["orderDate", "DESC"]],
          })
        : Promise.resolve([]),
      Product.findAll({
        where: recentProductWhere,
        attributes: ["id", "sku", "name", "brand", "unit", "createdAt"],
        order: [["createdAt", "DESC"]],
      }),
      grossProfitOf(todaySales),
      grossProfitOf(weekSales),
    ]);

  const weekPurchases = weekPurchasesRaw;

  const todayPurchases = weekPurchases.filter(
    (row) => new Date(row.orderDate) >= todayStart,
  );

  const stockByWarehouse = new Map(
    warehouses.map((row) => [
      row.id,
      {
        warehouseId: row.id,
        name: row.name,
        code: row.code,
        quantity: decimal.qty(0),
        itemCount: 0,
      },
    ]),
  );
  let totalStock = decimal.qty(0);
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const row of inventoryRows) {
    const available = decimal.available(row.quantity, row.reservedQuantity);
    totalStock = decimal.addQty(totalStock, available);
    const store = stockByWarehouse.get(row.warehouseId);
    if (store) {
      store.quantity = decimal.addQty(store.quantity, available);
      if (decimal.cmpQty(available, 0) > 0) store.itemCount += 1;
    }
    const reorderLevel = row.product?.reorderLevel || 0;
    if (decimal.cmpQty(available, 0) <= 0) outOfStockCount += 1;
    else if (decimal.cmpQty(available, reorderLevel) <= 0) lowStockCount += 1;
  }

  const publicPurchase = (row) => {
    const plain = row.toJSON ? row.toJSON() : row;
    return {
      id: plain.id,
      orderNumber: plain.orderNumber,
      orderDate: plain.orderDate,
      totalAmount: plain.totalAmount,
      status: plain.status,
      supplier: plain.supplier ? { id: plain.supplier.id, name: plain.supplier.name } : null,
    };
  };

  return {
    sales: {
      today: { count: todaySales.length, total: sumSales(todaySales) },
      week: { count: weekSales.length, total: sumSales(weekSales) },
      month: { count: monthSales.length, total: sumSales(monthSales) },
    },
    creditOutstanding,
    supplierPayables,
    overdueCreditCount: overdueCredit.length,
    bestSellers: bestSellers.map((row) => {
      const plain = row.toJSON();
      return {
        product: plain.product,
        soldQuantity: plain.soldQuantity,
        soldAmount: plain.soldAmount,
      };
    }),
    lowStock,
    deadStock,
    salespersonPerformance,
    followUpCustomers,
    totalStock,
    warehouseCount: warehouses.length,
    stockByWarehouse: [...stockByWarehouse.values()],
    purchases: {
      today: { count: todayPurchases.length, total: sumMoney(todayPurchases, "totalAmount") },
      week: { count: weekPurchases.length, total: sumMoney(weekPurchases, "totalAmount") },
    },
    lowStockCount,
    outOfStockCount,
    recentlyAddedCount: recentProducts.length,
    recentlyAdded: recentProducts.slice(0, 8).map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      brand: row.brand,
      unit: row.unit,
      createdAt: row.createdAt,
    })),
    recentPurchases: weekPurchases.slice(0, 8).map(publicPurchase),
    grossProfit: {
      today: grossProfitToday,
      week: grossProfitWeek,
    },
  };
};

exports.marketplace = async ({ search, warehouseId, brand, size, color }, user) => {
  const productWhere = { status: "ACTIVE" };
  tenant.applyCompany(productWhere, user);
  if (brand) productWhere.brand = { [Op.like]: `%${brand}%` };
  if (size) productWhere.size = { [Op.like]: `%${size}%` };
  if (color) productWhere.color = { [Op.like]: `%${color}%` };
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    productWhere[Op.or] = [
      { name: like },
      { sku: like },
      { brand: like },
      { size: like },
      { color: like },
    ];
  }

  const inventoryWhere = {};
  tenant.applyCompany(inventoryWhere, user);
  if (warehouseId) {
    tenant.assertWarehouseAccess(user, warehouseId);
    inventoryWhere.warehouseId = warehouseId;
  } else {
    tenant.applyWarehouse(inventoryWhere, user);
  }

  const rows = await Inventory.findAll({
    where: inventoryWhere,
    include: [
      {
        model: Product,
        as: "product",
        where: productWhere,
        required: true,
        include: [{ model: Category, as: "category", attributes: ["id", "name"] }],
      },
      { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code", "address"] },
    ],
    limit: 80,
    order: [[{ model: Product, as: "product" }, "name", "ASC"]],
  });

  return rows.map((row) => {
    const plain = row.toJSON();
    const available = decimal.available(plain.quantity, plain.reservedQuantity);
    const location = plain.warehouse?.address?.city || plain.warehouse?.name;
    return {
      productId: plain.productId,
      sku: plain.product.sku,
      name: plain.product.name,
      brand: plain.product.brand,
      size: plain.product.size,
      color: plain.product.color,
      category: plain.product.category,
      sellingPrice: plain.product.sellingPrice,
      available,
      warehouse: {
        id: plain.warehouse.id,
        name: plain.warehouse.name,
        code: plain.warehouse.code,
        location,
      },
    };
  }).filter((row) => decimal.cmpQty(row.available, 0) > 0);
};

const dateKey = (value) => new Date(value).toISOString().slice(0, 10);

const endOfDay = (value) => {
  const date = new Date(value);
  if (String(value).length <= 10) date.setHours(23, 59, 59, 999);
  return date;
};

const emptyBucket = (extra = {}) => ({
  quantity: decimal.qty(0),
  amount: decimal.money(0),
  lineCount: 0,
  ...extra,
});

const addToBucket = (bucket, qty, amount) => {
  bucket.quantity = decimal.addQty(bucket.quantity, qty);
  bucket.amount = decimal.addMoney(bucket.amount, amount);
  bucket.lineCount += 1;
  return bucket;
};

const summarizeLines = (lines) => {
  const byItemMap = new Map();
  const byDateMap = new Map();
  let totalQty = decimal.qty(0);
  let totalAmount = decimal.money(0);

  for (const line of lines) {
    const qty = decimal.qty(line.quantity);
    const amount = decimal.money(line.totalPrice);
    totalQty = decimal.addQty(totalQty, qty);
    totalAmount = decimal.addMoney(totalAmount, amount);

    const item = byItemMap.get(line.productId) || emptyBucket({
      productId: line.productId,
      name: line.productName,
      sku: line.sku || "",
      unit: line.unit,
      dates: new Map(),
    });
    addToBucket(item, qty, amount);
    const itemDay = item.dates.get(line.date) || emptyBucket({ date: line.date });
    addToBucket(itemDay, qty, amount);
    item.dates.set(line.date, itemDay);
    byItemMap.set(line.productId, item);

    const dayRow = byDateMap.get(line.date) || emptyBucket({
      date: line.date,
      documents: new Set(),
      items: new Map(),
    });
    addToBucket(dayRow, qty, amount);
    if (line.document) dayRow.documents.add(line.document);
    const dayItem = dayRow.items.get(line.productId) || emptyBucket({
      productId: line.productId,
      name: line.productName,
      sku: line.sku || "",
      unit: line.unit,
    });
    addToBucket(dayItem, qty, amount);
    dayRow.items.set(line.productId, dayItem);
    byDateMap.set(line.date, dayRow);
  }

  const byDate = [...byDateMap.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((row) => ({
      date: row.date,
      quantity: row.quantity,
      amount: row.amount,
      lineCount: row.lineCount,
      documentCount: row.documents.size,
      items: [...row.items.values()].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      ),
    }));

  const byItem = [...byItemMap.values()]
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
    .map((row) => ({
      productId: row.productId,
      name: row.name,
      sku: row.sku,
      unit: row.unit,
      quantity: row.quantity,
      amount: row.amount,
      lineCount: row.lineCount,
      dates: [...row.dates.values()].sort((a, b) => b.date.localeCompare(a.date)),
    }));

  const byDateItem = byDate.flatMap((day) =>
    day.items.map((item) => ({
      date: day.date,
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      quantity: item.quantity,
      amount: item.amount,
      lineCount: item.lineCount,
    })),
  );

  return {
    lines,
    byItem,
    byDate,
    byDateItem,
    totals: {
      quantity: totalQty,
      amount: totalAmount,
      lineCount: lines.length,
      documentCount: new Set(lines.map((line) => line.document).filter(Boolean)).size,
      itemCount: byItem.length,
    },
  };
};

exports.salesReport = async ({ from, to, productId, paymentMethod, paymentStatus, search, createdBy } = {}, user) => {
  const saleWhere = { status: "COMPLETED" };
  tenant.applyCompany(saleWhere, user);
  tenant.applyWarehouse(saleWhere, user);
  if (from || to) {
    saleWhere.saleDate = {};
    if (from) saleWhere.saleDate[Op.gte] = from;
    if (to) saleWhere.saleDate[Op.lte] = endOfDay(to);
  }
  if (paymentMethod) saleWhere.paymentMethod = paymentMethod;
  if (createdBy) saleWhere.createdBy = createdBy;
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    saleWhere[Op.or] = [{ invoiceNumber: like }, { customerName: like }, { customerPhone: like }];
  }
  const itemWhere = {};
  if (productId) itemWhere.productId = productId;

  const rows = await SaleItem.findAll({
    where: itemWhere,
    include: [
      {
        model: Sale,
        as: "sale",
        attributes: [
          "id",
          "invoiceNumber",
          "saleDate",
          "customerName",
          "status",
          "paidAmount",
          "totalAmount",
          "paymentMethod",
        ],
        where: saleWhere,
        include: [
          { model: User, as: "creator", attributes: ["id", "fullName", "username"] },
          { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
        ],
      },
      {
        model: Product,
        as: "product",
        attributes: ["id", "name", "unit", "sku", "brand", "size"],
      },
    ],
    order: [[{ model: Sale, as: "sale" }, "saleDate", "DESC"]],
  });

  const lines = rows
    .map((row) => {
      const plain = row.toJSON();
      const paid = plain.sale.paidAmount;
      const total = plain.sale.totalAmount;
      const payStatus =
        decimal.cmpMoney(paid, 0) <= 0
          ? "UNPAID"
          : decimal.cmpMoney(paid, total) >= 0
            ? "PAID"
            : "PARTIAL";
      return {
        id: plain.id,
        saleId: plain.sale.id,
        date: dateKey(plain.sale.saleDate),
        document: plain.sale.invoiceNumber,
        party: plain.sale.customerName || "Walk-in",
        salesman: plain.sale.creator?.fullName || plain.sale.creator?.username || "",
        warehouseName: plain.sale.warehouse?.name || "",
        productId: plain.productId,
        productName: plain.product?.name,
        sku: plain.product?.sku || "",
        unit: plain.product?.unit,
        quantity: plain.quantity,
        unitPrice: plain.unitPrice,
        totalPrice: plain.totalPrice,
        paymentMethod: plain.sale.paymentMethod,
        paymentStatus: payStatus,
        paidAmount: paid,
        remainingBalance: decimal.subMoney(total, paid),
      };
    })
    .filter((line) => !paymentStatus || line.paymentStatus === paymentStatus);
  return summarizeLines(lines);
};

exports.purchasesReport = async (
  { from, to, productId, paymentMethod, createdBy, supplierId } = {},
  user,
) => {
  const poWhere = { status: { [Op.ne]: "CANCELLED" } };
  tenant.applyCompany(poWhere, user);
  if (from || to) {
    poWhere.orderDate = {};
    if (from) poWhere.orderDate[Op.gte] = from;
    if (to) poWhere.orderDate[Op.lte] = endOfDay(to);
  }
  if (paymentMethod) poWhere.paymentMethod = paymentMethod;
  if (createdBy) poWhere.createdBy = createdBy;
  if (supplierId) poWhere.supplierId = supplierId;
  const itemWhere = {};
  if (productId) itemWhere.productId = productId;

  const rows = await PurchaseOrderItem.findAll({
    where: itemWhere,
    include: [
      {
        model: PurchaseOrder,
        as: "purchaseOrder",
        attributes: [
          "id",
          "orderNumber",
          "orderDate",
          "notes",
          "status",
          "paidAmount",
          "totalAmount",
          "paymentMethod",
          "createdBy",
        ],
        where: poWhere,
        include: [
          { model: models.Supplier, as: "supplier", attributes: ["id", "name"] },
          { model: User, as: "creator", attributes: ["id", "fullName", "username"] },
        ],
      },
      { model: Product, as: "product", attributes: ["id", "name", "unit", "sku", "brand", "size"] },
      { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
    ],
    order: [[{ model: PurchaseOrder, as: "purchaseOrder" }, "orderDate", "DESC"]],
  });

  const lines = rows.map((row) => {
    const plain = row.toJSON();
    const notes = plain.purchaseOrder?.notes || "";
    const walkIn = notes.startsWith("Walk-in:") ? notes : null;
    const paid = plain.purchaseOrder.paidAmount || 0;
    const total = plain.purchaseOrder.totalAmount || 0;
    const payStatus =
      decimal.cmpMoney(paid, 0) <= 0
        ? "UNPAID"
        : decimal.cmpMoney(paid, total) >= 0
          ? "PAID"
          : "PARTIAL";
    return {
      id: plain.id,
      purchaseOrderId: plain.purchaseOrder.id,
      date: dateKey(plain.purchaseOrder.orderDate),
      document: plain.purchaseOrder.orderNumber,
      party: walkIn ? walkIn.replace("Walk-in:", "Walk-in") : plain.purchaseOrder.supplier?.name,
      salesman: plain.purchaseOrder.creator?.fullName || plain.purchaseOrder.creator?.username || "",
      productId: plain.productId,
      productName: plain.product?.name,
      sku: plain.product?.sku || "",
      unit: plain.product?.unit,
      quantity: plain.quantity,
      receivedQuantity: plain.receivedQuantity,
      unitPrice: plain.unitPrice,
      totalPrice: plain.totalPrice,
      deliveryStatus: plain.deliveryStatus || "NOT_DELIVERED",
      warehouseId: plain.warehouseId || null,
      warehouseName: plain.warehouse?.name || null,
      paymentMethod: plain.purchaseOrder.paymentMethod || null,
      paidAmount: paid,
      remainingBalance: decimal.subMoney(total, paid),
      paymentStatus: payStatus,
    };
  });
  const report = summarizeLines(lines);
  report.undeliveredCount = lines.filter(
    (line) => line.deliveryStatus !== "DELIVERED",
  ).length;
  return report;
};

const marginPct = (profit, salesAmount) => {
  if (decimal.isZeroMoney(salesAmount)) return "0.00";
  return ((Number(profit) / Number(salesAmount)) * 100).toFixed(2);
};

const resultOf = (profit) => {
  const cmp = decimal.cmpMoney(profit, 0);
  if (cmp > 0) return "PROFIT";
  if (cmp < 0) return "LOSS";
  return "BREAKEVEN";
};

const profitFilters = (query, user) => {
  const from = query.from || query.startDate;
  const to = query.to || query.endDate;
  const productId = query.productId || query.itemId;
  const warehouseId = query.warehouseId || query.storeId;
  const createdBy = query.createdBy || query.salespersonId;
  const customerId = query.customerId;

  const saleWhere = { status: "COMPLETED" };
  tenant.applyCompany(saleWhere, user);
  tenant.applyWarehouse(saleWhere, user);

  if (from || to) {
    saleWhere.saleDate = {};
    if (from) saleWhere.saleDate[Op.gte] = from;
    if (to) saleWhere.saleDate[Op.lte] = endOfDay(to);
  }

  if (warehouseId) {
    const allowed = tenant.warehouseIdsOf(user);
    if (allowed && !allowed.includes(warehouseId)) {
      saleWhere.warehouseId = null;
    } else {
      saleWhere.warehouseId = warehouseId;
    }
  }
  if (createdBy) saleWhere.createdBy = createdBy;
  if (customerId) saleWhere.customerId = customerId;

  const itemWhere = {};
  if (productId) itemWhere.productId = productId;

  return { from, to, productId, warehouseId, createdBy, customerId, saleWhere, itemWhere };
};

const profitSqlFilters = (query, user, replacements) => {
  const from = query.from || query.startDate;
  const to = query.to || query.endDate;
  const productId = query.productId || query.itemId;
  const warehouseId = query.warehouseId || query.storeId;
  const createdBy = query.createdBy || query.salespersonId;
  const customerId = query.customerId;
  const allowed = tenant.warehouseIdsOf(user);

  replacements.companyId = tenant.companyIdOf(user) || "00000000-0000-0000-0000-000000000000";
  let sql = `s.status = 'COMPLETED' AND s.companyId = :companyId`;

  if (allowed) {
    if (!allowed.length) return { sql: "1=0", replacements };
    replacements.allowedWh = allowed;
    sql += ` AND s.warehouseId IN (:allowedWh)`;
  }
  if (from) {
    replacements.from = from;
    sql += ` AND s.saleDate >= :from`;
  }
  if (to) {
    replacements.to = endOfDay(to);
    sql += ` AND s.saleDate <= :to`;
  }
  if (warehouseId) {
    if (allowed && !allowed.includes(warehouseId)) return { sql: "1=0", replacements };
    replacements.warehouseId = warehouseId;
    sql += ` AND s.warehouseId = :warehouseId`;
  }
  if (createdBy) {
    replacements.createdBy = createdBy;
    sql += ` AND s.createdBy = :createdBy`;
  }
  if (customerId) {
    replacements.customerId = customerId;
    sql += ` AND s.customerId = :customerId`;
  }
  if (productId) {
    replacements.productId = productId;
    sql += ` AND si.productId = :productId`;
  }
  return { sql, replacements };
};

const COST_EXPR =
  `COALESCE((SELECT SUM(sca.totalCost) FROM sale_cost_allocations sca WHERE sca.saleItemId = si.id), ${"si.quantity * COALESCE(st.unitCost, inv.averageCost, p.purchasePrice, 0)"})`;
const PROFIT_EXPR = `si.totalPrice - (${COST_EXPR})`;

const attachPurchaseDates = async (lines) => {
  const productIds = [...new Set(lines.map((row) => row.productId).filter(Boolean))];
  if (!productIds.length) return lines;

  const [purchaseTxs, poRows] = await Promise.all([
    StockTransaction.findAll({
      where: { type: "PURCHASE", productId: { [Op.in]: productIds } },
      attributes: ["productId", "warehouseId", "createdAt"],
      order: [["createdAt", "DESC"]],
    }),
    PurchaseOrderItem.findAll({
      where: { productId: { [Op.in]: productIds } },
      include: [
        {
          model: PurchaseOrder,
          as: "purchaseOrder",
          attributes: ["orderDate", "orderNumber"],
          where: { status: { [Op.ne]: "CANCELLED" } },
          required: true,
        },
      ],
      order: [[{ model: PurchaseOrder, as: "purchaseOrder" }, "orderDate", "DESC"]],
    }),
  ]);

  const txByProduct = new Map();
  for (const tx of purchaseTxs) {
    const list = txByProduct.get(tx.productId) || [];
    list.push(tx);
    txByProduct.set(tx.productId, list);
  }
  const poByProduct = new Map();
  for (const row of poRows) {
    const list = poByProduct.get(row.productId) || [];
    list.push(row.toJSON());
    poByProduct.set(row.productId, list);
  }

  return lines.map((line) => {
    const sold = line.sellingDate;
    const txs = txByProduct.get(line.productId) || [];
    const txMatch =
      txs.find(
        (tx) =>
          tx.warehouseId === line.warehouseId &&
          (!sold || dateKey(tx.createdAt) <= sold),
      ) || txs.find((tx) => !sold || dateKey(tx.createdAt) <= sold);
    const pos = poByProduct.get(line.productId) || [];
    const poMatch = pos.find((po) => {
      const day = dateKey(po.purchaseOrder.orderDate);
      return !sold || day <= sold;
    });
    return {
      ...line,
      purchaseDate: txMatch
        ? dateKey(txMatch.createdAt)
        : poMatch
          ? dateKey(poMatch.purchaseOrder.orderDate)
          : null,
    };
  });
};

exports.itemProfitReport = async (query = {}, user) => {
  const exporting = query.export === true || query.export === "true";
  const { page, limit, offset } = paginate(
    { ...query, limit: exporting ? query.limit || 500 : query.limit },
    { defaultLimit: exporting ? 500 : 20, maxLimit: exporting ? 500 : 100 },
  );
  const { saleWhere, itemWhere } = profitFilters(query, user);

  const replacements = {};
  const { sql: whereSql } = profitSqlFilters(query, user, replacements);
  const summarySql = `
    SELECT
      COUNT(*) AS lineCount,
      COUNT(DISTINCT s.id) AS saleCount,
      COALESCE(SUM(si.quantity), 0) AS quantitySold,
      COALESCE(SUM(si.totalPrice), 0) AS revenue,
      COALESCE(SUM(${COST_EXPR}), 0) AS purchaseCost,
      COALESCE(SUM(CASE WHEN (${PROFIT_EXPR}) > 0 THEN (${PROFIT_EXPR}) ELSE 0 END), 0) AS totalProfit,
      COALESCE(SUM(CASE WHEN (${PROFIT_EXPR}) < 0 THEN (${PROFIT_EXPR}) ELSE 0 END), 0) AS totalLoss
    FROM sale_items si
    INNER JOIN sales s ON s.id = si.saleId
    INNER JOIN products p ON p.id = si.productId
    LEFT JOIN stock_transactions st
      ON st.referenceType = 'SALE'
     AND st.referenceId = s.id
     AND st.productId = si.productId
     AND st.warehouseId = s.warehouseId
     AND st.type = 'SALE'
    LEFT JOIN inventory inv
      ON inv.productId = si.productId
     AND inv.warehouseId = s.warehouseId
    WHERE ${whereSql}
  `;
  const [summaryRow] = await sequelize.query(summarySql, {
    replacements,
    type: QueryTypes.SELECT,
  });

  const revenue = decimal.money(summaryRow?.revenue || 0);
  const purchaseCost = decimal.money(summaryRow?.purchaseCost || 0);
  const netProfit = decimal.subMoney(revenue, purchaseCost);
  const totalProfit = decimal.money(summaryRow?.totalProfit || 0);
  const totalLoss = decimal.money(summaryRow?.totalLoss || 0);
  const quantitySold = decimal.qty(summaryRow?.quantitySold || 0);
  const summary = {
    saleCount: Number(summaryRow?.saleCount || 0),
    lineCount: Number(summaryRow?.lineCount || 0),
    quantitySold,
    revenue,
    purchaseCost,
    profit: netProfit,
    totalProfit,
    totalLoss: decimal.cmpMoney(totalLoss, 0) < 0 ? decimal.subMoney("0.00", totalLoss) : totalLoss,
    profitMargin: marginPct(netProfit, revenue),
    result: resultOf(netProfit),
  };

  const { rows, count } = await SaleItem.findAndCountAll({
    where: itemWhere,
    include: [
      {
        model: Sale,
        as: "sale",
        required: true,
        where: saleWhere,
        attributes: [
          "id",
          "invoiceNumber",
          "saleDate",
          "warehouseId",
          "createdBy",
          "customerId",
          "customerName",
        ],
        include: [
          { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
          { model: User, as: "creator", attributes: ["id", "fullName", "username"] },
          { model: Customer, as: "customer", attributes: ["id", "name"], required: false },
        ],
      },
      {
        model: Product,
        as: "product",
        attributes: ["id", "name", "sku", "unit", "purchasePrice"],
      },
    ],
    order: [[{ model: Sale, as: "sale" }, "saleDate", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  const saleIds = [...new Set(rows.map((row) => row.saleId || row.sale?.id).filter(Boolean))];
  const saleCosts = new Map();
  const inventoryCost = new Map();
  const allocationCost = new Map();
  if (saleIds.length) {
    const invWhere = tenant.applyCompany({}, user);
    const pairs = rows.map((row) => ({
      productId: row.productId,
      warehouseId: row.sale?.warehouseId,
    })).filter((row) => row.productId && row.warehouseId);
    if (pairs.length) {
      invWhere[Op.or] = pairs.map((pair) => ({
        productId: pair.productId,
        warehouseId: pair.warehouseId,
      }));
    }
    const [txs, invRows, allocRows] = await Promise.all([
      StockTransaction.findAll({
        where: {
          type: "SALE",
          referenceType: "SALE",
          referenceId: { [Op.in]: saleIds },
        },
        attributes: ["referenceId", "productId", "warehouseId", "unitCost"],
      }),
      Inventory.findAll({
        attributes: ["productId", "warehouseId", "averageCost"],
        where: invWhere,
      }),
      SaleCostAllocation.findAll({
        where: { saleId: { [Op.in]: saleIds } },
        include: [
          {
            model: SaleItem,
            as: "saleItem",
            attributes: ["id", "productId", "quantity"],
          },
        ],
      }),
    ]);
    for (const tx of txs) {
      saleCosts.set(`${tx.referenceId}|${tx.productId}`, decimal.money(tx.unitCost || 0));
    }
    for (const inv of invRows) {
      inventoryCost.set(`${inv.productId}|${inv.warehouseId}`, decimal.money(inv.averageCost || 0));
    }
    for (const alloc of allocRows) {
      const key = `${alloc.saleId}|${alloc.saleItem?.productId || alloc.saleItemId}`;
      const current = allocationCost.get(key) || decimal.money(0);
      allocationCost.set(key, decimal.addMoney(current, alloc.totalCost));
    }
  }

  const mapped = rows.map((row) => {
    const plain = row.toJSON();
    const sale = plain.sale;
    const quantity = decimal.qty(plain.quantity);
    const sellingPrice = decimal.money(plain.unitPrice);
    const totalSellingAmount = decimal.money(plain.totalPrice);
    const allocated = allocationCost.get(`${sale.id}|${plain.productId}`);
    const unitFromAlloc = allocated
      ? decimal.money(Number(allocated) / Number(quantity || 1))
      : null;
    const purchasePrice =
      unitFromAlloc ||
      saleCosts.get(`${sale.id}|${plain.productId}`) ||
      inventoryCost.get(`${plain.productId}|${sale.warehouseId}`) ||
      decimal.money(plain.product?.purchasePrice || 0);
    const totalPurchaseAmount = allocated
      ? allocated
      : decimal.lineTotal(quantity, purchasePrice);
    const profit = decimal.subMoney(totalSellingAmount, totalPurchaseAmount);
    return {
      id: plain.id,
      saleId: sale.id,
      productId: plain.productId,
      productName: plain.product?.name,
      sku: plain.product?.sku || "",
      unit: plain.product?.unit || "",
      customerId: sale.customerId || null,
      customerName: sale.customer?.name || sale.customerName || "Walk-in",
      warehouseId: sale.warehouseId,
      warehouseName: sale.warehouse?.name || "",
      salespersonId: sale.createdBy,
      salespersonName: sale.creator?.fullName || sale.creator?.username || "",
      purchasePrice,
      sellingPrice,
      sellingDate: dateKey(sale.saleDate),
      quantity,
      totalPurchaseAmount,
      totalSellingAmount,
      profit,
      profitMargin: marginPct(profit, totalSellingAmount),
      result: resultOf(profit),
      document: sale.invoiceNumber,
    };
  });

  const lines = await attachPurchaseDates(mapped);
  const result = paginate.buildResult("lines", lines, count, page, limit);
  return {
    lines: result.lines,
    summary,
    totals: {
      ...summary,
      salesAmount: summary.revenue,
      costAmount: summary.purchaseCost,
      amount: summary.revenue,
    },
    meta: result.meta,
  };
};

const itemNames = (items = []) =>
  items
    .map((item) => item.product?.name)
    .filter(Boolean)
    .join(", ");

exports.ledger = async (user) => {
  const saleWhere = {
    status: "COMPLETED",
    [Op.and]: literal("`Sale`.`paidAmount` < `Sale`.`totalAmount`"),
  };
  tenant.applyCompany(saleWhere, user);
  tenant.applyWarehouse(saleWhere, user);
  const poWhere = {
    status: { [Op.ne]: "CANCELLED" },
    [Op.and]: literal(
      "`PurchaseOrder`.`paidAmount` < `PurchaseOrder`.`totalAmount`",
    ),
  };
  tenant.applyCompany(poWhere, user);
  const [sales, orders] = await Promise.all([
    Sale.findAll({
      where: saleWhere,
      include: [
        {
          model: SaleItem,
          as: "items",
          include: [{ model: Product, as: "product", attributes: ["id", "name", "unit"] }],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "name", "phone"],
          required: false,
        },
      ],
      order: [["saleDate", "ASC"]],
    }),
    PurchaseOrder.findAll({
      where: poWhere,
      include: [
        {
          model: PurchaseOrderItem,
          as: "items",
          include: [{ model: Product, as: "product", attributes: ["id", "name", "unit"] }],
        },
        { model: Supplier, as: "supplier", attributes: ["id", "name", "phone"] },
      ],
      order: [["orderDate", "ASC"]],
    }),
  ]);

  const credits = sales.map((sale) => {
    const plain = sale.toJSON();
    const remaining = decimal.subMoney(plain.totalAmount, plain.paidAmount || 0);
    return {
      id: plain.id,
      date: plain.saleDate,
      document: plain.invoiceNumber,
      partyName: plain.customerName || plain.customer?.name || "Walk-in",
      partyPhone: plain.customerPhone || plain.customer?.phone || "",
      customerId: plain.customerId || null,
      items: itemNames(plain.items),
      totalAmount: plain.totalAmount,
      paidAmount: plain.paidAmount,
      remainingBalance: remaining,
      paymentMethod: plain.paymentMethod,
    };
  });

  const debits = orders.map((order) => {
    const plain = order.toJSON();
    const remaining = decimal.subMoney(plain.totalAmount, plain.paidAmount || 0);
    return {
      id: plain.id,
      date: plain.orderDate,
      document: plain.orderNumber,
      partyName: plain.supplier?.name || "Supplier",
      partyPhone: plain.supplier?.phone || "",
      supplierId: plain.supplierId,
      items: itemNames(plain.items),
      totalAmount: plain.totalAmount,
      paidAmount: plain.paidAmount,
      remainingBalance: remaining,
      paymentMethod: plain.paymentMethod,
    };
  });

  const creditTotal = credits.reduce(
    (sum, row) => decimal.addMoney(sum, row.remainingBalance),
    decimal.money(0),
  );
  const debitTotal = debits.reduce(
    (sum, row) => decimal.addMoney(sum, row.remainingBalance),
    decimal.money(0),
  );

  return { creditTotal, debitTotal, credits, debits };
};

const monthKey = (value) => dateKey(value).slice(0, 7);

const resolvedVat = (taxAmount, netAmount) => {
  if (taxAmount != null && decimal.cmpMoney(taxAmount, 0) > 0) {
    return decimal.money(taxAmount);
  }
  return vat.vatOf(netAmount);
};

const emptyMonth = (month) => ({
  month,
  salesNet: decimal.money(0),
  salesVat: decimal.money(0),
  salesTotal: decimal.money(0),
  salesCount: 0,
  purchaseNet: decimal.money(0),
  purchaseVat: decimal.money(0),
  purchaseTotal: decimal.money(0),
  purchaseCount: 0,
});

exports.vatReport = async ({ from, to } = {}, user) => {
  const includeSales =
    tenant.isOwner(user) || tenant.hasPermission(user, "sales", "READ");
  const includePurchases =
    tenant.isOwner(user) || tenant.hasPermission(user, "purchasing", "READ");

  const saleWhere = { status: "COMPLETED" };
  tenant.applyCompany(saleWhere, user);
  tenant.applyWarehouse(saleWhere, user);
  if (from || to) {
    saleWhere.saleDate = {};
    if (from) saleWhere.saleDate[Op.gte] = from;
    if (to) saleWhere.saleDate[Op.lte] = endOfDay(to);
  }

  const poWhere = { status: { [Op.ne]: "CANCELLED" } };
  tenant.applyCompany(poWhere, user);
  if (from || to) {
    poWhere.orderDate = {};
    if (from) poWhere.orderDate[Op.gte] = from;
    if (to) poWhere.orderDate[Op.lte] = endOfDay(to);
  }

  const [saleRows, purchaseRows] = await Promise.all([
    includeSales
      ? Sale.findAll({
          where: saleWhere,
          attributes: [
            "id",
            "invoiceNumber",
            "saleDate",
            "customerName",
            "subtotal",
            "taxAmount",
            "discountAmount",
            "totalAmount",
          ],
          include: [
            {
              model: Customer,
              as: "customer",
              attributes: ["id", "name"],
              required: false,
            },
          ],
          order: [["saleDate", "DESC"]],
        })
      : [],
    includePurchases
      ? PurchaseOrder.findAll({
          where: poWhere,
          attributes: [
            "id",
            "orderNumber",
            "orderDate",
            "notes",
            "subtotal",
            "taxAmount",
            "discountAmount",
            "totalAmount",
          ],
          include: [
            { model: Supplier, as: "supplier", attributes: ["id", "name"], required: false },
          ],
          order: [["orderDate", "DESC"]],
        })
      : [],
  ]);

  const sales = saleRows.map((row) => {
    const plain = row.toJSON();
    const net = decimal.money(plain.subtotal || 0);
    const vatAmount = resolvedVat(plain.taxAmount, net);
    const total =
      decimal.cmpMoney(plain.totalAmount || 0, 0) > 0
        ? decimal.money(plain.totalAmount)
        : vat.withVat(net);
    return {
      id: plain.id,
      date: dateKey(plain.saleDate),
      document: plain.invoiceNumber,
      party: plain.customerName || plain.customer?.name || "Walk-in",
      net,
      vat: vatAmount,
      total,
    };
  });

  const purchases = purchaseRows.map((row) => {
    const plain = row.toJSON();
    const notes = plain.notes || "";
    const walkIn = notes.startsWith("Walk-in:") ? notes.replace("Walk-in:", "Walk-in") : null;
    const net = decimal.money(plain.subtotal || 0);
    const vatAmount = resolvedVat(plain.taxAmount, net);
    const total =
      decimal.cmpMoney(plain.totalAmount || 0, 0) > 0
        ? decimal.money(plain.totalAmount)
        : vat.withVat(net);
    return {
      id: plain.id,
      date: dateKey(plain.orderDate),
      document: plain.orderNumber,
      party: walkIn || plain.supplier?.name || "Supplier",
      net,
      vat: vatAmount,
      total,
    };
  });

  const months = {};
  const addMonth = (date, kind, net, vatAmount, total) => {
    const key = monthKey(date);
    if (!months[key]) months[key] = emptyMonth(key);
    const bucket = months[key];
    if (kind === "sales") {
      bucket.salesNet = decimal.addMoney(bucket.salesNet, net);
      bucket.salesVat = decimal.addMoney(bucket.salesVat, vatAmount);
      bucket.salesTotal = decimal.addMoney(bucket.salesTotal, total);
      bucket.salesCount += 1;
    } else {
      bucket.purchaseNet = decimal.addMoney(bucket.purchaseNet, net);
      bucket.purchaseVat = decimal.addMoney(bucket.purchaseVat, vatAmount);
      bucket.purchaseTotal = decimal.addMoney(bucket.purchaseTotal, total);
      bucket.purchaseCount += 1;
    }
  };

  sales.forEach((row) => addMonth(row.date, "sales", row.net, row.vat, row.total));
  purchases.forEach((row) => addMonth(row.date, "purchase", row.net, row.vat, row.total));

  const monthly = Object.values(months)
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((row) => ({
      ...row,
      netVat: decimal.subMoney(row.salesVat, row.purchaseVat),
    }));

  const sum = (rows, field) =>
    rows.reduce((acc, row) => decimal.addMoney(acc, row[field]), decimal.money(0));

  const salesVat = sum(sales, "vat");
  const purchaseVat = sum(purchases, "vat");

  return {
    vatRate: vat.rate(),
    from: from || null,
    to: to || null,
    totals: {
      salesNet: sum(sales, "net"),
      salesVat,
      salesTotal: sum(sales, "total"),
      salesCount: sales.length,
      purchaseNet: sum(purchases, "net"),
      purchaseVat,
      purchaseTotal: sum(purchases, "total"),
      purchaseCount: purchases.length,
      netVat: decimal.subMoney(salesVat, purchaseVat),
    },
    monthly,
    sales,
    purchases,
  };
};
