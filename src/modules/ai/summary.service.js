const env = require("../../config/env");
const analytics = require("./analytics.service");
const { generateText, extractJson } = require("./geminiClient");

const compact = (value, max = 4500) => JSON.stringify(value).slice(0, max);

const narrate = async (kind, payload) => {
  if (!env.GEMINI_API_KEY) {
    return {
      headline: `${kind === "daily" ? "Daily" : kind === "monthly" ? "Monthly" : "Insight"} summary`,
      bullets: [
        "Numbers below are calculated from your company data.",
        "Set GEMINI_API_KEY on the server for AI-written commentary.",
      ],
      language: "en",
    };
  }

  try {
    const text = await generateText(
      `You are an inventory ERP analyst. Summarize ONLY the JSON metrics for a business owner.
Never invent numbers. Keep it short and actionable.
Return JSON only:
{"headline":"one sentence","bullets":["3 to 6 bullets"],"language":"en"}
Kind: ${kind}
Data: ${compact(payload)}`,
    );
    const parsed = extractJson(text);
    if (parsed?.headline) {
      return {
        headline: String(parsed.headline),
        bullets: Array.isArray(parsed.bullets)
          ? parsed.bullets.map(String).slice(0, 8)
          : [],
        language: parsed.language || "en",
      };
    }
  } catch (err) {
    console.error("[ai/summary] narrate failed:", err.message || err);
  }

  return {
    headline: "Summary ready from your company records",
    bullets: ["Review the metrics and lists below for details."],
    language: "en",
  };
};

const mapProduct = (row) => ({
  id: row.productId || row.id,
  name: row.productName || row.name || row.product,
  sku: row.sku || null,
  quantity: row.quantitySold ?? row.quantity ?? row.available ?? row.currentStock ?? null,
  revenue: row.revenue ?? null,
  profit: row.grossProfit ?? null,
  margin: row.profitMargin ?? null,
  warehouse: row.warehouseName || row.warehouse || null,
  daysRemaining: row.daysRemaining ?? row.estimatedDaysRemaining ?? null,
  reason: row.reason || null,
  suggestedQty: row.recommendedPurchaseQuantity ?? row.suggestedQty ?? null,
});

exports.getDailySummary = async (filters, user) => {
  const today = { ...filters, period: "today" };
  const [sales, purchases, movement, low, topSelling, profitProducts] =
    await Promise.all([
      analytics.getSalesSummary(today, user),
      analytics.getPurchaseSummary(today, user),
      analytics.getStockMovement(today, user),
      analytics.getLowStockProducts(filters, user),
      analytics.getFastMovingProducts(today, user),
      analytics.getTopProfitableProducts({ ...today, limit: 5 }, user),
    ]);

  const cards = {
    sales: sales.revenue,
    purchases: purchases.amount,
    profit: sales.grossProfit,
    profitMargin: sales.profitMargin,
    invoices: sales.invoiceCount,
    purchaseOrders: purchases.orderCount,
    lowStockCount: (low.products || []).length,
  };

  const lists = {
    stockMovements: (movement.byType || []).slice(0, 12),
    lowStock: (low.products || []).slice(0, 10).map(mapProduct),
    topSelling: (topSelling.products || []).slice(0, 8).map(mapProduct),
    topProfit: (profitProducts.products || []).slice(0, 5).map(mapProduct),
  };

  const narrative = await narrate("daily", { cards, lists });

  return {
    period: "today",
    cards,
    lists,
    narrative,
    meta: {
      lastUpdated: new Date().toISOString(),
      salesMeta: sales.meta,
      purchaseMeta: purchases.meta,
    },
  };
};

exports.getMonthlySummary = async (filters, user) => {
  const month = { ...filters, period: "this_month" };
  const [
    sales,
    purchases,
    purchaseTrend,
    topProfit,
    loss,
    warehouses,
    salesmen,
    fast,
    slow,
  ] = await Promise.all([
    analytics.getSalesSummary(month, user),
    analytics.getPurchaseSummary(month, user),
    analytics.getPurchaseTrend(month, user),
    analytics.getTopProfitableProducts({ ...month, limit: 8 }, user),
    analytics.getLossMakingProducts(month, user),
    analytics.getWarehousePerformance(month, user),
    analytics.getSalesmanPerformance(month, user),
    analytics.getFastMovingProducts(month, user),
    analytics.getSlowMovingProducts(month, user),
  ]);

  const cards = {
    sales: sales.revenue,
    purchases: purchases.amount,
    profit: sales.grossProfit,
    profitMargin: sales.profitMargin,
    cogs: sales.cogs,
    invoices: sales.invoiceCount,
    lossMakingCount: (loss.products || []).length,
  };

  const lists = {
    bestProducts: (topProfit.products || []).slice(0, 8).map(mapProduct),
    worstProducts: (loss.products || []).slice(0, 8).map(mapProduct),
    stores: (warehouses.warehouses || []).slice(0, 10).map((row) => ({
      id: row.id || row.warehouseId,
      name: row.name || row.warehouseName,
      revenue: row.revenue,
      profit: row.grossProfit,
      margin: row.profitMargin,
    })),
    salesmen: (salesmen.salesmen || []).slice(0, 10).map((row) => ({
      id: row.id || row.userId,
      name: row.name || row.fullName,
      revenue: row.revenue,
      profit: row.grossProfit,
      invoices: row.invoiceCount,
    })),
    fastMoving: (fast.products || []).slice(0, 8).map(mapProduct),
    slowMoving: (slow.products || []).slice(0, 8).map(mapProduct),
    purchaseTrend: (purchaseTrend.points || []).slice(-14),
  };

  const narrative = await narrate("monthly", { cards, lists });

  return {
    period: "this_month",
    cards,
    lists,
    narrative,
    meta: {
      lastUpdated: new Date().toISOString(),
      salesMeta: sales.meta,
    },
  };
};

exports.getInsightBoard = async (filters, user) => {
  const month = { ...filters, period: filters.period || "this_month" };
  const [fast, dead, low, recs, topProfit, loss, stockout, warehouses] =
    await Promise.all([
      analytics.getFastMovingProducts(month, user),
      analytics.getDeadStock({ ...filters, deadDays: 45 }, user),
      analytics.getLowStockProducts(filters, user),
      analytics.getPurchaseRecommendations(filters, user),
      analytics.getTopProfitableProducts({ ...month, limit: 8 }, user),
      analytics.getLossMakingProducts(month, user),
      analytics.getStockoutRisk(filters, user),
      analytics.getWarehousePerformance(month, user),
    ]);

  const prompts = [
    {
      id: "fastest",
      question: "Which products are selling fastest?",
      answerHint: "Top quantity sold this period",
      items: (fast.products || []).slice(0, 8).map(mapProduct),
    },
    {
      id: "unsold",
      question: "Which items haven't sold recently?",
      answerHint: "Dead / slow stock",
      items: (dead.products || []).slice(0, 8).map(mapProduct),
    },
    {
      id: "store-stock",
      question: "Which store needs stock?",
      answerHint: "Low stock and stockout risk by store",
      items: (stockout.products || low.products || [])
        .slice(0, 8)
        .map(mapProduct),
    },
    {
      id: "reorder",
      question: "What products should we reorder?",
      answerHint: "Purchase recommendations",
      items: (recs.recommendations || []).slice(0, 8).map(mapProduct),
    },
    {
      id: "most-profit",
      question: "Where are we making the most profit?",
      answerHint: "Best products and stores",
      items: (topProfit.products || []).slice(0, 8).map(mapProduct),
      stores: (warehouses.warehouses || []).slice(0, 5).map((row) => ({
        name: row.name || row.warehouseName,
        profit: row.grossProfit,
        revenue: row.revenue,
      })),
    },
    {
      id: "losses",
      question: "Which products are losing money?",
      answerHint: "Negative gross margin items",
      items: (loss.products || []).slice(0, 8).map(mapProduct),
    },
  ];

  const narrative = await narrate("insights", {
    prompts: prompts.map((p) => ({
      question: p.question,
      count: (p.items || []).length,
      top: (p.items || [])[0] || null,
    })),
  });

  return {
    prompts,
    narrative,
    meta: { lastUpdated: new Date().toISOString() },
  };
};
