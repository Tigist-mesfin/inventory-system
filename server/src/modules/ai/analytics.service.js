const decimal = require("../../shared/helpers/decimal.helper");
const tenant = require("../../shared/helpers/tenant.helper");
const { run, wh } = require("./db");
const period = require("./period");
const { scope, meta } = require("./scope");
const math = require("./analytics.math");

const COSTING =
  "Weighted average: sale line COGS = quantity × stock_transactions.unitCost (WAC snapshot). Missing snapshots use current inventory.averageCost, then products.purchasePrice, and are labeled estimate.";

const decorateProfit = (row) => {
  const revenue = decimal.money(row.revenue || 0);
  const cogs = decimal.money(row.cogs || 0);
  const profit = math.grossProfit(revenue, cogs);
  const estimated = Number(row.estimatedLines || 0) > 0;
  return {
    ...row,
    quantitySold: row.quantitySold,
    revenue,
    cogs,
    discounts: decimal.money(row.discounts || 0),
    grossProfit: profit,
    profitMargin: math.marginPct(profit, revenue),
    costBasis: estimated ? "estimate" : "wac_snapshot",
  };
};

const salesJoin = `
  FROM sale_items si
  INNER JOIN sales s ON s.id = si.saleId
  INNER JOIN products p ON p.id = si.productId
  LEFT JOIN categories cat ON cat.id = p.categoryId
  INNER JOIN warehouses w ON w.id = s.warehouseId
  LEFT JOIN stock_transactions st
    ON st.referenceType = 'SALE'
   AND st.referenceId = s.id
   AND st.productId = si.productId
   AND st.warehouseId = s.warehouseId
   AND st.type = 'SALE'
  LEFT JOIN inventory inv
    ON inv.productId = si.productId
   AND inv.warehouseId = s.warehouseId
`;

const cogsExpr = `SUM(si.quantity * COALESCE(st.unitCost, inv.averageCost, p.purchasePrice, 0))`;
const estimatedExpr = `SUM(CASE WHEN st.id IS NULL THEN 1 ELSE 0 END)`;

const productProfitSql = (replacements, warehouseIds, extraWhere = "") => `
  SELECT
    p.id AS productId,
    p.name AS productName,
    p.sku,
    p.unit,
    cat.name AS categoryName,
    w.id AS warehouseId,
    w.name AS warehouseName,
    SUM(si.quantity) AS quantitySold,
    SUM(si.totalPrice) AS revenue,
    SUM(si.discountAmount) AS discounts,
    ${cogsExpr} AS cogs,
    ${estimatedExpr} AS estimatedLines,
    COUNT(*) AS lineCount
  ${salesJoin}
  WHERE s.status = 'COMPLETED'
    AND s.companyId = :companyId
    AND s.saleDate >= :from
    AND s.saleDate <= :to
    AND ${wh("s.warehouseId", warehouseIds, replacements)}
    ${extraWhere}
  GROUP BY p.id, p.name, p.sku, p.unit, cat.name, w.id, w.name
`;

exports.getProductProfit = async (filters, user) => {
  const sc = scope(user, filters);
  const range = period.resolvePeriod(filters);
  const replacements = {
    companyId: sc.companyId,
    from: range.from,
    to: range.to,
  };
  const extra = filters.productId ? "AND p.id = :productId" : "";
  if (filters.productId) replacements.productId = filters.productId;
  const rows = await run(
    productProfitSql(replacements, sc.warehouseIds, extra),
    replacements,
  );
  const products = rows.map(decorateProfit);
  const totals = products.reduce(
    (acc, row) => ({
      revenue: decimal.addMoney(acc.revenue, row.revenue),
      cogs: decimal.addMoney(acc.cogs, row.cogs),
      quantitySold: decimal.addQty(acc.quantitySold, row.quantitySold || 0),
    }),
    { revenue: decimal.money(0), cogs: decimal.money(0), quantitySold: decimal.qty(0) },
  );
  const profit = math.grossProfit(totals.revenue, totals.cogs);
  return {
    products,
    totals: {
      ...totals,
      grossProfit: profit,
      profitMargin: math.marginPct(profit, totals.revenue),
    },
    meta: meta(range, {
      recordsAnalyzed: products.length,
      calculation: COSTING,
    }),
  };
};

exports.getTopProfitableProducts = async (filters, user) => {
  const result = await exports.getProductProfit(filters, user);
  const sorted = [...result.products].sort(
    (a, b) => Number(b.grossProfit) - Number(a.grossProfit),
  );
  return {
    ...result,
    products: sorted.slice(0, Number(filters.limit || 10)),
  };
};

exports.getLossMakingProducts = async (filters, user) => {
  const result = await exports.getProductProfit(filters, user);
  const loss = result.products.filter((row) => Number(row.grossProfit) < 0);
  return { ...result, products: loss };
};

exports.getProductLoss = exports.getLossMakingProducts;

exports.getSalesSummary = async (filters, user) => {
  const sc = scope(user, filters);
  const range = period.resolvePeriod(filters);
  const replacements = {
    companyId: sc.companyId,
    from: range.from,
    to: range.to,
  };
  const rows = await run(
    `
    SELECT
      COUNT(DISTINCT s.id) AS invoiceCount,
      COALESCE(SUM(si.quantity), 0) AS quantitySold,
      COALESCE(SUM(si.totalPrice), 0) AS revenue,
      COALESCE(SUM(si.discountAmount), 0) AS discounts,
      ${cogsExpr} AS cogs,
      ${estimatedExpr} AS estimatedLines
    ${salesJoin}
    WHERE s.status = 'COMPLETED'
      AND s.companyId = :companyId
      AND s.saleDate >= :from
      AND s.saleDate <= :to
      AND ${wh("s.warehouseId", sc.warehouseIds, replacements)}
    `,
    replacements,
  );
  const row = rows[0] || {};
  const revenue = decimal.money(row.revenue || 0);
  const cogs = decimal.money(row.cogs || 0);
  const profit = math.grossProfit(revenue, cogs);
  return {
    invoiceCount: Number(row.invoiceCount || 0),
    quantitySold: row.quantitySold || 0,
    revenue,
    discounts: decimal.money(row.discounts || 0),
    cogs,
    grossProfit: profit,
    profitMargin: math.marginPct(profit, revenue),
    costBasis: Number(row.estimatedLines || 0) > 0 ? "mixed" : "wac_snapshot",
    meta: meta(range, {
      recordsAnalyzed: Number(row.invoiceCount || 0),
      calculation: COSTING,
    }),
  };
};

exports.getPurchaseSummary = async (filters, user) => {
  const sc = scope(user, filters);
  const range = period.resolvePeriod(filters);
  const replacements = {
    companyId: sc.companyId,
    from: range.from,
    to: range.to,
  };
  const rows = await run(
    `
    SELECT
      COUNT(DISTINCT po.id) AS orderCount,
      COALESCE(SUM(poi.quantity), 0) AS quantity,
      COALESCE(SUM(poi.totalPrice), 0) AS amount
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po ON po.id = poi.purchaseOrderId
    WHERE po.status <> 'CANCELLED'
      AND po.companyId = :companyId
      AND po.orderDate >= :from
      AND po.orderDate <= :to
      AND (
        poi.warehouseId IS NULL
        OR ${wh("poi.warehouseId", sc.warehouseIds, replacements)}
      )
    `,
    replacements,
  );
  const row = rows[0] || {};
  return {
    orderCount: Number(row.orderCount || 0),
    quantity: row.quantity || 0,
    amount: decimal.money(row.amount || 0),
    meta: meta(range, {
      recordsAnalyzed: Number(row.orderCount || 0),
      calculation: "Sum of purchase_order_items.totalPrice on non-cancelled POs.",
    }),
  };
};

const groupSales = async (filters, user, group) => {
  const sc = scope(user, filters);
  const range = period.resolvePeriod(filters);
  const replacements = {
    companyId: sc.companyId,
    from: range.from,
    to: range.to,
  };
  const select = {
    product: "p.id AS id, p.name AS name, p.unit AS extra",
    category: "cat.id AS id, cat.name AS name, '' AS extra",
    warehouse: "w.id AS id, w.name AS name, '' AS extra",
    salesman: "u.id AS id, u.fullName AS name, u.username AS extra",
    customer: "COALESCE(s.customerId, s.customerName) AS id, COALESCE(s.customerName, 'Walk-in') AS name, s.customerPhone AS extra",
    payment: "s.paymentMethod AS id, s.paymentMethod AS name, '' AS extra",
  }[group];
  const joins =
    group === "salesman"
      ? `${salesJoin} INNER JOIN users u ON u.id = s.createdBy`
      : salesJoin;
  const groupBy = {
    product: "p.id, p.name, p.unit",
    category: "cat.id, cat.name",
    warehouse: "w.id, w.name",
    salesman: "u.id, u.fullName, u.username",
    customer: "s.customerId, s.customerName, s.customerPhone",
    payment: "s.paymentMethod",
  }[group];
  const salesmanFilter = filters.salesmanId ? "AND s.createdBy = :salesmanId" : "";
  if (filters.salesmanId) replacements.salesmanId = filters.salesmanId;
  if (filters.search && group === "salesman") {
    replacements.search = `%${filters.search}%`;
  }
  const searchFilter =
    filters.search && group === "salesman"
      ? "AND (u.fullName LIKE :search OR u.username LIKE :search)"
      : "";

  const rows = await run(
    `
    SELECT
      ${select},
      COUNT(DISTINCT s.id) AS invoiceCount,
      SUM(si.quantity) AS quantitySold,
      SUM(si.totalPrice) AS revenue,
      SUM(si.discountAmount) AS discounts,
      ${cogsExpr} AS cogs,
      ${estimatedExpr} AS estimatedLines
    ${joins}
    WHERE s.status = 'COMPLETED'
      AND s.companyId = :companyId
      AND s.saleDate >= :from
      AND s.saleDate <= :to
      AND ${wh("s.warehouseId", sc.warehouseIds, replacements)}
      ${salesmanFilter}
      ${searchFilter}
    GROUP BY ${groupBy}
    ORDER BY revenue DESC
    LIMIT 50
    `,
    replacements,
  );
  return {
    rows: rows.map((row) => {
      const decorated = decorateProfit(row);
      return {
        id: row.id,
        name: row.name,
        extra: row.extra,
        invoiceCount: Number(row.invoiceCount || 0),
        quantitySold: row.quantitySold,
        ...decorated,
      };
    }),
    meta: meta(range, {
      recordsAnalyzed: rows.length,
      calculation: COSTING,
      groupedBy: group,
    }),
  };
};

exports.getSalesByProduct = (filters, user) => groupSales(filters, user, "product");
exports.getSalesByCategory = (filters, user) => groupSales(filters, user, "category");
exports.getSalesByWarehouse = (filters, user) => groupSales(filters, user, "warehouse");
exports.getSalesBySalesman = (filters, user) => groupSales(filters, user, "salesman");
exports.getSalesByCustomer = (filters, user) => groupSales(filters, user, "customer");
exports.getSalesByPayment = (filters, user) => groupSales(filters, user, "payment");

exports.getSalesTrend = async (filters, user) => {
  const sc = scope(user, filters);
  const range = period.resolvePeriod(filters);
  const replacements = {
    companyId: sc.companyId,
    from: range.from,
    to: range.to,
  };
  const rows = await run(
    `
    SELECT DATE(s.saleDate) AS day,
           COUNT(DISTINCT s.id) AS invoiceCount,
           COALESCE(SUM(s.totalAmount), 0) AS revenue
    FROM sales s
    WHERE s.status = 'COMPLETED'
      AND s.companyId = :companyId
      AND s.saleDate >= :from
      AND s.saleDate <= :to
      AND ${wh("s.warehouseId", sc.warehouseIds, replacements)}
    GROUP BY DATE(s.saleDate)
    ORDER BY day ASC
    `,
    replacements,
  );
  return {
    points: rows.map((row) => ({
      date: row.day,
      invoiceCount: Number(row.invoiceCount || 0),
      revenue: decimal.money(row.revenue || 0),
    })),
    meta: meta(range, {
      recordsAnalyzed: rows.length,
      calculation: "Daily SUM(sales.totalAmount) for COMPLETED invoices.",
    }),
  };
};

exports.getProfitTrend = async (filters, user) => {
  const sc = scope(user, filters);
  const range = period.resolvePeriod(filters);
  const replacements = {
    companyId: sc.companyId,
    from: range.from,
    to: range.to,
  };
  const rows = await run(
    `
    SELECT DATE(s.saleDate) AS day,
           SUM(si.totalPrice) AS revenue,
           ${cogsExpr} AS cogs
    ${salesJoin}
    WHERE s.status = 'COMPLETED'
      AND s.companyId = :companyId
      AND s.saleDate >= :from
      AND s.saleDate <= :to
      AND ${wh("s.warehouseId", sc.warehouseIds, replacements)}
    GROUP BY DATE(s.saleDate)
    ORDER BY day ASC
    `,
    replacements,
  );
  return {
    points: rows.map((row) => {
      const revenue = decimal.money(row.revenue || 0);
      const cogs = decimal.money(row.cogs || 0);
      const profit = math.grossProfit(revenue, cogs);
      return {
        date: row.day,
        revenue,
        cogs,
        grossProfit: profit,
        profitMargin: math.marginPct(profit, revenue),
      };
    }),
    meta: meta(range, { recordsAnalyzed: rows.length, calculation: COSTING }),
  };
};

exports.getPurchaseTrend = async (filters, user) => {
  const sc = scope(user, filters);
  const range = period.resolvePeriod(filters);
  const replacements = {
    companyId: sc.companyId,
    from: range.from,
    to: range.to,
  };
  const rows = await run(
    `
    SELECT DATE(po.orderDate) AS day,
           COUNT(DISTINCT po.id) AS orderCount,
           COALESCE(SUM(poi.totalPrice), 0) AS amount
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po ON po.id = poi.purchaseOrderId
    WHERE po.status <> 'CANCELLED'
      AND po.companyId = :companyId
      AND po.orderDate >= :from
      AND po.orderDate <= :to
    GROUP BY DATE(po.orderDate)
    ORDER BY day ASC
    `,
    replacements,
  );
  return {
    points: rows.map((row) => ({
      date: row.day,
      orderCount: Number(row.orderCount || 0),
      amount: decimal.money(row.amount || 0),
    })),
    meta: meta(range, {
      recordsAnalyzed: rows.length,
      calculation: "Daily purchase_order_items.totalPrice.",
    }),
  };
};

exports.comparePeriods = async (filters, user) => {
  const currentRange = period.resolvePeriod(filters);
  const previousRange = period.previousPeriod(currentRange);
  const [current, previous] = await Promise.all([
    exports.getSalesSummary({ ...filters, from: currentRange.from, to: currentRange.to, period: "custom" }, user),
    exports.getSalesSummary({ ...filters, from: previousRange.from, to: previousRange.to, period: "custom" }, user),
  ]);
  return {
    current,
    previous,
    change: {
      revenue: math.percentChange(current.revenue, previous.revenue),
      grossProfit: math.percentChange(current.grossProfit, previous.grossProfit),
      invoiceCount:
        previous.invoiceCount === 0
          ? current.invoiceCount === 0
            ? "0.00"
            : null
          : (
              ((current.invoiceCount - previous.invoiceCount) /
                previous.invoiceCount) *
              100
            ).toFixed(2),
    },
    meta: {
      period: `${currentRange.label} vs previous`,
      from: currentRange.fromKey,
      to: currentRange.toKey,
      previousFrom: previousRange.fromKey,
      previousTo: previousRange.toKey,
      lastUpdated: new Date().toISOString(),
      recordsAnalyzed: current.invoiceCount + previous.invoiceCount,
      calculation: "Percentage change = (current - previous) / previous × 100. Null if previous is zero and current is not.",
    },
  };
};

exports.getSalesmanPerformance = async (filters, user) => {
  const current = await groupSales(filters, user, "salesman");
  const prevFilters = {
    ...filters,
    period: "custom",
    from: period.previousPeriod(period.resolvePeriod(filters)).from,
    to: period.previousPeriod(period.resolvePeriod(filters)).to,
  };
  const previous = await groupSales(prevFilters, user, "salesman");
  const prevMap = new Map(previous.rows.map((row) => [String(row.id), row]));
  const ranked = current.rows.map((row) => {
    const prior = prevMap.get(String(row.id));
    const aov =
      row.invoiceCount > 0
        ? decimal.money(Number(row.revenue) / row.invoiceCount)
        : decimal.money(0);
    return {
      ...row,
      averageOrderValue: aov,
      salesGrowth: prior
        ? math.percentChange(row.revenue, prior.revenue)
        : null,
      previousRevenue: prior ? prior.revenue : decimal.money(0),
    };
  });
  const by = (key, dir = "desc") =>
    [...ranked].sort((a, b) =>
      dir === "desc" ? Number(b[key] || 0) - Number(a[key] || 0) : Number(a[key] || 0) - Number(b[key] || 0),
    );
  return {
    salesmen: ranked,
    ranking: {
      byRevenue: by("revenue").map((row) => row.name),
      byProfit: by("grossProfit").map((row) => row.name),
      byMargin: [...ranked]
        .filter((row) => row.profitMargin != null)
        .sort((a, b) => Number(b.profitMargin) - Number(a.profitMargin))
        .map((row) => row.name),
      byGrowth: [...ranked]
        .filter((row) => row.salesGrowth != null)
        .sort((a, b) => Number(b.salesGrowth) - Number(a.salesGrowth))
        .map((row) => row.name),
      lowestRevenue: by("revenue", "asc").map((row) => row.name),
    },
    unsupported: ["targets", "returns"],
    meta: current.meta,
  };
};

exports.getWarehousePerformance = async (filters, user) => {
  const sales = await groupSales(filters, user, "warehouse");
  const sc = scope(user, filters);
  const replacements = { companyId: sc.companyId };
  const stock = await run(
    `
    SELECT w.id AS id, w.name AS name,
           COALESCE(SUM(inv.quantity), 0) AS quantity,
           COALESCE(SUM(inv.quantity * inv.averageCost), 0) AS inventoryValue
    FROM warehouses w
    LEFT JOIN inventory inv ON inv.warehouseId = w.id
    WHERE w.companyId = :companyId
      AND ${wh("w.id", sc.warehouseIds, replacements)}
    GROUP BY w.id, w.name
    `,
    replacements,
  );
  const stockMap = new Map(stock.map((row) => [row.id, row]));
  const warehouses = sales.rows.map((row) => {
    const st = stockMap.get(row.id) || {};
    const turnover =
      Number(st.inventoryValue || 0) > 0
        ? (Number(row.cogs) / Number(st.inventoryValue)).toFixed(2)
        : null;
    return {
      ...row,
      stockQuantity: st.quantity || 0,
      inventoryValue: decimal.money(st.inventoryValue || 0),
      stockTurnover: turnover,
    };
  });
  return {
    warehouses,
    highestSales: warehouses[0] || null,
    mostProfitable: [...warehouses].sort(
      (a, b) => Number(b.grossProfit) - Number(a.grossProfit),
    )[0] || null,
    meta: sales.meta,
  };
};

exports.getWarehouseStock = async (filters, user) => {
  const sc = scope(user, filters);
  const replacements = { companyId: sc.companyId };
  const rows = await run(
    `
    SELECT w.id AS warehouseId, w.name AS warehouseName,
           p.id AS productId, p.name AS productName, p.unit, p.reorderLevel,
           inv.quantity, inv.reservedQuantity, inv.averageCost,
           (inv.quantity * inv.averageCost) AS inventoryValue
    FROM inventory inv
    INNER JOIN products p ON p.id = inv.productId
    INNER JOIN warehouses w ON w.id = inv.warehouseId
    WHERE inv.companyId = :companyId
      AND ${wh("inv.warehouseId", sc.warehouseIds, replacements)}
    ORDER BY inventoryValue DESC
    LIMIT 200
    `,
    replacements,
  );
  const total = rows.reduce(
    (sum, row) => decimal.addMoney(sum, row.inventoryValue || 0),
    decimal.money(0),
  );
  return {
    rows: rows.map((row) => ({
      ...row,
      available: decimal.available(row.quantity, row.reservedQuantity),
      averageCost: decimal.money(row.averageCost),
      inventoryValue: decimal.money(row.inventoryValue),
    })),
    totalValue: total,
    meta: {
      period: "Current on-hand",
      lastUpdated: new Date().toISOString(),
      recordsAnalyzed: rows.length,
      calculation: "inventory.quantity × inventory.averageCost (WAC).",
    },
  };
};

exports.getInventoryValuation = exports.getWarehouseStock;

exports.getLowStockProducts = async (filters, user) => {
  const sc = scope(user, filters);
  const replacements = { companyId: sc.companyId };
  const rows = await run(
    `
    SELECT p.id AS productId, p.name AS productName, p.unit, p.reorderLevel, p.reorderQuantity,
           w.id AS warehouseId, w.name AS warehouseName,
           inv.quantity, inv.reservedQuantity
    FROM inventory inv
    INNER JOIN products p ON p.id = inv.productId
    INNER JOIN warehouses w ON w.id = inv.warehouseId
    WHERE inv.companyId = :companyId
      AND ${wh("inv.warehouseId", sc.warehouseIds, replacements)}
      AND (inv.quantity - inv.reservedQuantity) <= p.reorderLevel
    ORDER BY (inv.quantity - inv.reservedQuantity) ASC
    LIMIT 100
    `,
    replacements,
  );
  return {
    products: rows.map((row) => ({
      ...row,
      available: decimal.available(row.quantity, row.reservedQuantity),
    })),
    meta: {
      period: "Current on-hand",
      lastUpdated: new Date().toISOString(),
      recordsAnalyzed: rows.length,
      calculation: "available = quantity - reservedQuantity; low when available <= products.reorderLevel.",
    },
  };
};

exports.getDeadStock = async (filters, user) => {
  const sc = scope(user, filters);
  const days = Number(filters.deadDays || 90);
  const replacements = {
    companyId: sc.companyId,
    cutoff: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
  };
  const rows = await run(
    `
    SELECT p.id AS productId, p.name AS productName, p.unit,
           w.id AS warehouseId, w.name AS warehouseName,
           inv.quantity, inv.averageCost,
           (inv.quantity * inv.averageCost) AS inventoryValue,
           MAX(s.saleDate) AS lastSoldAt
    FROM inventory inv
    INNER JOIN products p ON p.id = inv.productId
    INNER JOIN warehouses w ON w.id = inv.warehouseId
    LEFT JOIN sale_items si ON si.productId = inv.productId
    LEFT JOIN sales s ON s.id = si.saleId
      AND s.status = 'COMPLETED'
      AND s.warehouseId = inv.warehouseId
      AND s.companyId = :companyId
    WHERE inv.companyId = :companyId
      AND inv.quantity > 0
      AND ${wh("inv.warehouseId", sc.warehouseIds, replacements)}
    GROUP BY p.id, p.name, p.unit, w.id, w.name, inv.quantity, inv.averageCost
    HAVING lastSoldAt IS NULL OR lastSoldAt < :cutoff
    ORDER BY inventoryValue DESC
    LIMIT 100
    `,
    replacements,
  );
  const value = rows.reduce(
    (sum, row) => decimal.addMoney(sum, row.inventoryValue || 0),
    decimal.money(0),
  );
  return {
    products: rows.map((row) => ({
      ...row,
      averageCost: decimal.money(row.averageCost),
      inventoryValue: decimal.money(row.inventoryValue),
    })),
    deadStockValue: value,
    deadDays: days,
    meta: {
      period: `No completed sales in ${days} days`,
      lastUpdated: new Date().toISOString(),
      recordsAnalyzed: rows.length,
      calculation: `On-hand qty > 0 and last completed sale at that warehouse is null or older than ${days} days.`,
    },
  };
};

const velocity = async (filters, user, order) => {
  const sc = scope(user, filters);
  const range = period.resolvePeriod({ ...filters, period: filters.period || "this_month" });
  const replacements = {
    companyId: sc.companyId,
    from: range.from,
    to: range.to,
  };
  const rows = await run(
    `
    SELECT p.id AS productId, p.name AS productName, p.unit,
           SUM(si.quantity) AS quantitySold,
           SUM(si.totalPrice) AS revenue
    ${salesJoin}
    WHERE s.status = 'COMPLETED'
      AND s.companyId = :companyId
      AND s.saleDate >= :from
      AND s.saleDate <= :to
      AND ${wh("s.warehouseId", sc.warehouseIds, replacements)}
    GROUP BY p.id, p.name, p.unit
    ORDER BY quantitySold ${order}
    LIMIT 15
    `,
    replacements,
  );
  return {
    products: rows.map((row) => ({
      ...row,
      revenue: decimal.money(row.revenue),
    })),
    meta: meta(range, {
      recordsAnalyzed: rows.length,
      calculation: "SUM(sale_items.quantity) on completed sales.",
    }),
  };
};

exports.getFastMovingProducts = (filters, user) => velocity(filters, user, "DESC");
exports.getSlowMovingProducts = (filters, user) => velocity(filters, user, "ASC");

exports.getStockMovement = async (filters, user) => {
  const sc = scope(user, filters);
  const range = period.resolvePeriod(filters);
  const replacements = {
    companyId: sc.companyId,
    from: range.from,
    to: range.to,
  };
  const rows = await run(
    `
    SELECT type, COUNT(*) AS txnCount, COALESCE(SUM(quantity), 0) AS quantity
    FROM stock_transactions
    WHERE companyId = :companyId
      AND createdAt >= :from
      AND createdAt <= :to
      AND ${wh("warehouseId", sc.warehouseIds, replacements)}
    GROUP BY type
    ORDER BY type
    `,
    replacements,
  );
  return {
    byType: rows,
    meta: meta(range, {
      recordsAnalyzed: rows.reduce((n, row) => n + Number(row.txnCount || 0), 0),
      calculation: "COUNT/SUM of stock_transactions in the period.",
    }),
  };
};

exports.getStockoutRisk = async (filters, user) => {
  const sc = scope(user, filters);
  const lookback = period.resolvePeriod({ period: "this_month" });
  const replacements = {
    companyId: sc.companyId,
    from: lookback.from,
    to: lookback.to,
  };
  const days = Math.max(
    1,
    Math.round((lookback.to - lookback.from) / (24 * 60 * 60 * 1000)) + 1,
  );
  const rows = await run(
    `
    SELECT p.id AS productId, p.name AS productName, p.unit, p.reorderQuantity,
           w.id AS warehouseId, w.name AS warehouseName,
           inv.quantity,
           COALESCE(sold.qty, 0) AS soldQty
    FROM inventory inv
    INNER JOIN products p ON p.id = inv.productId
    INNER JOIN warehouses w ON w.id = inv.warehouseId
    LEFT JOIN (
      SELECT s.warehouseId, si.productId, SUM(si.quantity) AS qty
      FROM sale_items si
      INNER JOIN sales s ON s.id = si.saleId
      WHERE s.status = 'COMPLETED'
        AND s.companyId = :companyId
        AND s.saleDate >= :from
        AND s.saleDate <= :to
      GROUP BY s.warehouseId, si.productId
    ) sold ON sold.warehouseId = inv.warehouseId AND sold.productId = inv.productId
    WHERE inv.companyId = :companyId
      AND ${wh("inv.warehouseId", sc.warehouseIds, replacements)}
    `,
    replacements,
  );
  const risks = rows
    .map((row) => {
      const avgDaily = Number(row.soldQty || 0) / days;
      const daysLeft = math.daysRemaining(row.quantity, avgDaily);
      return {
        ...row,
        averageDailySales: Number(avgDaily.toFixed(3)),
        daysRemaining: daysLeft,
        risk:
          daysLeft == null
            ? Number(row.quantity) <= 0
              ? "unknown_no_sales"
              : "no_recent_sales"
            : daysLeft <= 7
              ? "high"
              : daysLeft <= 21
                ? "medium"
                : "low",
      };
    })
    .filter((row) => row.risk === "high" || row.risk === "medium")
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));
  return {
    products: risks.slice(0, 40),
    meta: meta(lookback, {
      recordsAnalyzed: rows.length,
      calculation: `days remaining = on-hand qty / (qty sold in period / ${days} days).`,
    }),
  };
};

exports.getPurchaseRecommendations = async (filters, user) => {
  const [low, risk] = await Promise.all([
    exports.getLowStockProducts(filters, user),
    exports.getStockoutRisk(filters, user),
  ]);
  const map = new Map();
  for (const row of [...low.products, ...risk.products]) {
    const key = `${row.productId}|${row.warehouseId}`;
    if (!map.has(key)) map.set(key, row);
  }
  const recs = [...map.values()].slice(0, 10).map((row) => ({
    product: row.productName,
    productId: row.productId,
    warehouse: row.warehouseName,
    currentStock: row.quantity ?? row.available,
    averageDailySales: row.averageDailySales ?? null,
    estimatedDaysRemaining: row.daysRemaining ?? null,
    recommendedPurchaseQuantity: math.recommendedQty(
      row.averageDailySales || 0,
      21,
      row.quantity ?? row.available ?? 0,
      row.reorderQuantity,
    ),
    reason:
      row.risk === "high"
        ? "Likely to run out within 7 days at the recent sales rate."
        : "On-hand quantity is at or below the reorder level.",
  }));
  return {
    recommendations: recs,
    meta: {
      period: risk.meta.period,
      lastUpdated: new Date().toISOString(),
      recordsAnalyzed: recs.length,
      calculation: "Union of low-stock (reorderLevel) and stockout-risk (sales velocity). Does not create purchase orders.",
    },
  };
};

exports.getOverstock = async (filters, user) => {
  const sc = scope(user, filters);
  const lookback = period.resolvePeriod({ period: "this_month" });
  const days = Math.max(
    1,
    Math.round((lookback.to - lookback.from) / (24 * 60 * 60 * 1000)) + 1,
  );
  const replacements = {
    companyId: sc.companyId,
    from: lookback.from,
    to: lookback.to,
  };
  const [rows, sold] = await Promise.all([
    run(
      `
      SELECT p.id AS productId, p.name AS productName, p.unit,
             w.id AS warehouseId, w.name AS warehouseName,
             inv.quantity, (inv.quantity * inv.averageCost) AS inventoryValue
      FROM inventory inv
      INNER JOIN products p ON p.id = inv.productId
      INNER JOIN warehouses w ON w.id = inv.warehouseId
      WHERE inv.companyId = :companyId
        AND inv.quantity > 0
        AND ${wh("inv.warehouseId", sc.warehouseIds, replacements)}
      `,
      replacements,
    ),
    run(
      `
      SELECT s.warehouseId, si.productId, SUM(si.quantity) AS qty
      FROM sale_items si
      INNER JOIN sales s ON s.id = si.saleId
      WHERE s.status = 'COMPLETED'
        AND s.companyId = :companyId
        AND s.saleDate >= :from
        AND s.saleDate <= :to
        AND ${wh("s.warehouseId", sc.warehouseIds, replacements)}
      GROUP BY s.warehouseId, si.productId
      `,
      replacements,
    ),
  ]);
  const soldMap = new Map(
    sold.map((row) => [`${row.productId}|${row.warehouseId}`, Number(row.qty || 0)]),
  );
  const products = rows
    .map((row) => {
      const avgDaily = (soldMap.get(`${row.productId}|${row.warehouseId}`) || 0) / days;
      const daysLeft = math.daysRemaining(row.quantity, avgDaily);
      return {
        ...row,
        inventoryValue: decimal.money(row.inventoryValue),
        averageDailySales: Number(avgDaily.toFixed(3)),
        daysRemaining: daysLeft,
      };
    })
    .filter((row) => row.daysRemaining == null || row.daysRemaining > 90)
    .sort((a, b) => Number(b.inventoryValue) - Number(a.inventoryValue));
  return {
    products: products.slice(0, 40),
    meta: {
      period: lookback.label,
      lastUpdated: new Date().toISOString(),
      recordsAnalyzed: rows.length,
      calculation: "Overstock if on-hand covers more than 90 days of this month's average daily sales, or there were no sales.",
    },
  };
};

exports.getTransferAnalysis = async (filters, user) => {
  const sc = scope(user, filters);
  const range = period.resolvePeriod(filters);
  const replacements = {
    companyId: sc.companyId,
    from: range.from,
    to: range.to,
  };
  const rows = await run(
    `
    SELECT p.id AS productId, p.name AS productName,
           src.id AS sourceWarehouseId, src.name AS sourceWarehouse,
           dst.id AS destinationWarehouseId, dst.name AS destinationWarehouse,
           COUNT(*) AS transferCount,
           SUM(sti.quantity) AS quantity
    FROM stock_transfer_items sti
    INNER JOIN stock_transfers st ON st.id = sti.stockTransferId
    INNER JOIN products p ON p.id = sti.productId
    INNER JOIN warehouses src ON src.id = st.sourceWarehouseId
    INNER JOIN warehouses dst ON dst.id = st.destinationWarehouseId
    WHERE st.status = 'COMPLETED'
      AND st.companyId = :companyId
      AND st.transferDate >= :from
      AND st.transferDate <= :to
    GROUP BY p.id, p.name, src.id, src.name, dst.id, dst.name
    ORDER BY quantity DESC
    LIMIT 50
    `,
    replacements,
  );
  const senders = await run(
    `
    SELECT src.name AS warehouse, COUNT(*) AS transferCount, SUM(sti.quantity) AS quantity
    FROM stock_transfer_items sti
    INNER JOIN stock_transfers st ON st.id = sti.stockTransferId
    INNER JOIN warehouses src ON src.id = st.sourceWarehouseId
    WHERE st.status = 'COMPLETED' AND st.companyId = :companyId
      AND st.transferDate >= :from AND st.transferDate <= :to
    GROUP BY src.name
    ORDER BY quantity DESC
    `,
    replacements,
  );
  const receivers = await run(
    `
    SELECT dst.name AS warehouse, COUNT(*) AS transferCount, SUM(sti.quantity) AS quantity
    FROM stock_transfer_items sti
    INNER JOIN stock_transfers st ON st.id = sti.stockTransferId
    INNER JOIN warehouses dst ON dst.id = st.destinationWarehouseId
    WHERE st.status = 'COMPLETED' AND st.companyId = :companyId
      AND st.transferDate >= :from AND st.transferDate <= :to
    GROUP BY dst.name
    ORDER BY quantity DESC
    `,
    replacements,
  );

  const over = await exports.getOverstock(filters, user);
  const low = await exports.getLowStockProducts(filters, user);
  const suggestions = [];
  for (const excess of over.products.slice(0, 20)) {
    const needy = low.products.find(
      (row) =>
        row.productId === excess.productId &&
        row.warehouseId !== excess.warehouseId,
    );
    if (!needy) continue;
    const qty = Math.min(
      Number(excess.quantity || 0) * 0.3,
      Number(needy.reorderQuantity || needy.reorderLevel || 0) || Number(excess.quantity || 0) * 0.2,
    );
    if (qty < 0.001) continue;
    suggestions.push({
      product: excess.productName,
      from: excess.warehouseName,
      to: needy.warehouseName,
      suggestedQuantity: Number(qty.toFixed(3)),
      reason: `${excess.warehouseName} has long cover of this item while ${needy.warehouseName} is at/below reorder level.`,
    });
  }

  return {
    flows: rows,
    frequentSenders: senders,
    frequentReceivers: receivers,
    transferInsteadOfBuy: suggestions.slice(0, 8),
    meta: meta(range, {
      recordsAnalyzed: rows.length,
      calculation: "COMPLETED stock_transfers × items. Suggestions only when overstock and low-stock coincide for the same product.",
    }),
  };
};

exports.getPurchaseAnalytics = async (filters, user) => {
  const sc = scope(user, filters);
  const range = period.resolvePeriod(filters);
  const replacements = {
    companyId: sc.companyId,
    from: range.from,
    to: range.to,
  };
  const bySupplier = await run(
    `
    SELECT sup.id AS id, sup.name AS name,
           COUNT(DISTINCT po.id) AS orderCount,
           COALESCE(SUM(poi.totalPrice), 0) AS amount
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po ON po.id = poi.purchaseOrderId
    INNER JOIN suppliers sup ON sup.id = po.supplierId
    WHERE po.status <> 'CANCELLED'
      AND po.companyId = :companyId
      AND po.orderDate >= :from
      AND po.orderDate <= :to
    GROUP BY sup.id, sup.name
    ORDER BY amount DESC
    LIMIT 20
    `,
    replacements,
  );
  const byProduct = await run(
    `
    SELECT p.id AS id, p.name AS name, p.unit,
           SUM(poi.quantity) AS quantity,
           SUM(poi.totalPrice) AS amount,
           AVG(poi.unitPrice) AS avgPrice
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po ON po.id = poi.purchaseOrderId
    INNER JOIN products p ON p.id = poi.productId
    WHERE po.status <> 'CANCELLED'
      AND po.companyId = :companyId
      AND po.orderDate >= :from
      AND po.orderDate <= :to
    GROUP BY p.id, p.name, p.unit
    ORDER BY amount DESC
    LIMIT 20
    `,
    replacements,
  );
  const priceMoves = await run(
    `
    SELECT p.id AS productId, p.name AS productName,
           MIN(ph.purchasePrice) AS minPrice,
           MAX(ph.purchasePrice) AS maxPrice,
           SUBSTRING_INDEX(GROUP_CONCAT(ph.purchasePrice ORDER BY ph.createdAt), ',', 1) AS firstPrice,
           SUBSTRING_INDEX(GROUP_CONCAT(ph.purchasePrice ORDER BY ph.createdAt DESC), ',', 1) AS lastPrice
    FROM price_histories ph
    INNER JOIN products p ON p.id = ph.productId
    WHERE ph.companyId = :companyId
      AND ph.createdAt >= :from
      AND ph.createdAt <= :to
    GROUP BY p.id, p.name
    HAVING firstPrice <> lastPrice
    LIMIT 50
    `,
    replacements,
  );
  return {
    bySupplier: bySupplier.map((row) => ({
      ...row,
      amount: decimal.money(row.amount),
    })),
    byProduct: byProduct.map((row) => ({
      ...row,
      amount: decimal.money(row.amount),
      avgPrice: decimal.money(row.avgPrice || 0),
    })),
    priceChanges: priceMoves.map((row) => ({
      ...row,
      direction: Number(row.lastPrice) > Number(row.firstPrice) ? "increased" : "decreased",
    })),
    meta: meta(range, {
      recordsAnalyzed: bySupplier.length + byProduct.length,
      calculation: "Non-cancelled purchase orders. Price changes from price_histories in the period.",
    }),
  };
};

exports.getMarginMix = async (filters, user) => {
  const result = await exports.getProductProfit(filters, user);
  const highVolumeLowMargin = result.products
    .filter((row) => Number(row.profitMargin) != null && Number(row.profitMargin) < 10 && Number(row.quantitySold) > 0)
    .sort((a, b) => Number(b.quantitySold) - Number(a.quantitySold))
    .slice(0, 10);
  const lowVolumeHighMargin = result.products
    .filter((row) => Number(row.profitMargin) != null && Number(row.profitMargin) >= 30)
    .sort((a, b) => Number(a.quantitySold) - Number(b.quantitySold))
    .slice(0, 10);
  const declining = await compareProductProfit(filters, user);
  return {
    highVolumeLowMargin,
    lowVolumeHighMargin,
    negativeMargin: result.products.filter((row) => Number(row.grossProfit) < 0),
    decliningProfitability: declining.declining,
    increasingProfitability: declining.increasing,
    meta: result.meta,
  };
};

const compareProductProfit = async (filters, user) => {
  const currentRange = period.resolvePeriod(filters);
  const previousRange = period.previousPeriod(currentRange);
  const [cur, prev] = await Promise.all([
    exports.getProductProfit({ ...filters, period: "custom", from: currentRange.from, to: currentRange.to }, user),
    exports.getProductProfit({ ...filters, period: "custom", from: previousRange.from, to: previousRange.to }, user),
  ]);
  const prevMap = new Map(prev.products.map((row) => [`${row.productId}|${row.warehouseId}`, row]));
  const declining = [];
  const increasing = [];
  for (const row of cur.products) {
    const prior = prevMap.get(`${row.productId}|${row.warehouseId}`);
    if (!prior) continue;
    const change = Number(row.grossProfit) - Number(prior.grossProfit);
    const payload = {
      productName: row.productName,
      warehouseName: row.warehouseName,
      currentProfit: row.grossProfit,
      previousProfit: prior.grossProfit,
    };
    if (change < 0) declining.push(payload);
    if (change > 0) increasing.push(payload);
  }
  return {
    declining: declining.slice(0, 10),
    increasing: increasing.slice(0, 10),
  };
};

exports.getInsightsDashboard = async (filters, user) => {
  const month = { ...filters, period: "this_month" };
  const today = { ...filters, period: "today" };
  const [
    todaySales,
    monthSales,
    comparison,
    topProducts,
    loss,
    salesmen,
    warehouses,
    valuation,
    low,
    dead,
    recs,
  ] = await Promise.all([
    exports.getSalesSummary(today, user),
    exports.getSalesSummary(month, user),
    exports.comparePeriods(month, user),
    exports.getTopProfitableProducts({ ...month, limit: 5 }, user),
    exports.getLossMakingProducts(month, user),
    exports.getSalesmanPerformance(month, user),
    exports.getWarehousePerformance(month, user),
    exports.getInventoryValuation(filters, user),
    exports.getLowStockProducts(filters, user),
    exports.getDeadStock({ ...filters, deadDays: 90 }, user),
    exports.getPurchaseRecommendations(filters, user),
  ]);

  let operatingExpenses = null;
  if (tenant.hasPermission(user, "finance", "READ") || tenant.isOwner(user)) {
    const expenseService = require("../finance/expense.service");
    const statement = await expenseService.incomeStatement(month, user);
    operatingExpenses = statement.operatingExpenses.amount;
  }

  const topProduct = topProducts.products[0] || null;
  const topSalesman = salesmen.salesmen[0] || null;
  const topWarehouse = warehouses.highestSales;
  const insights = [];
  if (comparison.change.revenue != null) {
    insights.push({
      text: `Sales changed ${comparison.change.revenue}% versus the previous period.`,
      period: comparison.meta.period,
      metrics: {
        currentRevenue: comparison.current.revenue,
        previousRevenue: comparison.previous.revenue,
        percentChange: comparison.change.revenue,
      },
    });
  }
  if (topProduct) {
    insights.push({
      text: `${topProduct.productName} generated the highest gross profit this month.`,
      period: monthSales.meta.period,
      metrics: {
        revenue: topProduct.revenue,
        cogs: topProduct.cogs,
        grossProfit: topProduct.grossProfit,
        margin: topProduct.profitMargin,
      },
    });
  }
  if (topSalesman) {
    insights.push({
      text: `${topSalesman.name} generated the highest revenue this month among visible salesmen.`,
      period: monthSales.meta.period,
      metrics: {
        revenue: topSalesman.revenue,
        grossProfit: topSalesman.grossProfit,
        invoices: topSalesman.invoiceCount,
      },
    });
  }
  if (loss.products[0]) {
    insights.push({
      text: `${loss.products[0].productName} currently has a negative gross margin.`,
      period: monthSales.meta.period,
      metrics: {
        revenue: loss.products[0].revenue,
        cogs: loss.products[0].cogs,
        grossProfit: loss.products[0].grossProfit,
      },
    });
  }

  return {
    cards: {
      todaySales: todaySales.revenue,
      monthlySales: monthSales.revenue,
      monthlyGrossProfit: monthSales.grossProfit,
      profitMargin: monthSales.profitMargin,
      operatingExpenses,
      totalInventoryValue: valuation.totalValue,
      lowStockCount: low.products.length,
      deadStockValue: dead.deadStockValue,
      topProduct: topProduct
        ? { name: topProduct.productName, profit: topProduct.grossProfit }
        : null,
      topSalesman: topSalesman
        ? { name: topSalesman.name, revenue: topSalesman.revenue }
        : null,
      topWarehouse: topWarehouse
        ? { name: topWarehouse.name, revenue: topWarehouse.revenue }
        : null,
      lossMakingCount: loss.products.length,
      salesGrowth: comparison.change.revenue,
    },
    insights,
    recommendations: recs.recommendations,
    trend: await exports.getSalesTrend(month, user),
    meta: {
      period: monthSales.meta.period,
      from: monthSales.meta.from,
      to: monthSales.meta.to,
      lastUpdated: new Date().toISOString(),
      recordsAnalyzed: monthSales.meta.recordsAnalyzed,
      calculation: COSTING,
    },
  };
};

exports.FUNCTIONS = {
  getSalesSummary: exports.getSalesSummary,
  getPurchaseSummary: exports.getPurchaseSummary,
  getProductProfit: exports.getProductProfit,
  getProductLoss: exports.getProductLoss,
  getTopProfitableProducts: exports.getTopProfitableProducts,
  getLossMakingProducts: exports.getLossMakingProducts,
  getSalesmanPerformance: exports.getSalesmanPerformance,
  getWarehousePerformance: exports.getWarehousePerformance,
  getWarehouseStock: exports.getWarehouseStock,
  getStockMovement: exports.getStockMovement,
  getLowStockProducts: exports.getLowStockProducts,
  getDeadStock: exports.getDeadStock,
  getFastMovingProducts: exports.getFastMovingProducts,
  getSlowMovingProducts: exports.getSlowMovingProducts,
  getSalesTrend: exports.getSalesTrend,
  getPurchaseTrend: exports.getPurchaseTrend,
  getProfitTrend: exports.getProfitTrend,
  getTransferAnalysis: exports.getTransferAnalysis,
  getInventoryValuation: exports.getInventoryValuation,
  comparePeriods: exports.comparePeriods,
  getSalesByProduct: exports.getSalesByProduct,
  getSalesByCategory: exports.getSalesByCategory,
  getSalesByWarehouse: exports.getSalesByWarehouse,
  getSalesBySalesman: exports.getSalesBySalesman,
  getSalesByCustomer: exports.getSalesByCustomer,
  getSalesByPayment: exports.getSalesByPayment,
  getStockoutRisk: exports.getStockoutRisk,
  getPurchaseRecommendations: exports.getPurchaseRecommendations,
  getOverstock: exports.getOverstock,
  getPurchaseAnalytics: exports.getPurchaseAnalytics,
  getMarginMix: exports.getMarginMix,
  getInsightsDashboard: exports.getInsightsDashboard,
};
