const TOOLS = [
  "getSalesSummary",
  "getPurchaseSummary",
  "getProductProfit",
  "getProductLoss",
  "getTopProfitableProducts",
  "getLossMakingProducts",
  "getSalesmanPerformance",
  "getWarehousePerformance",
  "getWarehouseStock",
  "getStockMovement",
  "getLowStockProducts",
  "getDeadStock",
  "getFastMovingProducts",
  "getSlowMovingProducts",
  "getSalesTrend",
  "getPurchaseTrend",
  "getProfitTrend",
  "getTransferAnalysis",
  "getInventoryValuation",
  "comparePeriods",
  "getSalesByWarehouse",
  "getSalesBySalesman",
  "getSalesByProduct",
  "getSalesByCategory",
  "getSalesByCustomer",
  "getSalesByPayment",
  "getStockoutRisk",
  "getPurchaseRecommendations",
  "getOverstock",
  "getPurchaseAnalytics",
  "getMarginMix",
  "getInsightsDashboard",
];

exports.TOOLS = TOOLS;

exports.detectLanguage = (text) => {
  if (/[\u1200-\u137F]/.test(text)) return "am";
  if (
    /\b(har'?aa?|gurgurtaa|omisha|kuusaa|dhaabbata|gurgurtoota|bu'?aa)\b/i.test(
      text,
    )
  ) {
    return "om";
  }
  return "en";
};

exports.detectPeriod = (text) => {
  const q = text.toLowerCase();
  if (/ዛሬ|har'?a|\btoday\b/.test(q)) return "today";
  if (/ትላንት|yesterday/.test(q)) return "yesterday";
  if (/የዚህ ሳምንት|this week/.test(q)) return "this_week";
  if (/ባለፈው ሳምንት|last week/.test(q)) return "last_week";
  if (/የዚህ ወር|this month/.test(q)) return "this_month";
  if (/ባለፈው ወር|last month/.test(q)) return "last_month";
  if (/የዚህ ዓመት|this year/.test(q)) return "this_year";
  if (/compare|vs |versus|አወዳድር/.test(q)) return "this_month";
  return null;
};

const RULES = [
  { intent: "comparePeriods", re: /compare|versus|vs |አወዳድር|this month with last/i },
  { intent: "getPurchaseRecommendations", re: /should i (buy|purchase)|purchase again|what should i purchase|መግዛት|ግዛ/i },
  { intent: "getLossMakingProducts", re: /los(ing|s-making)|negative margin|losing money|ኪሳራ/i },
  { intent: "getTopProfitableProducts", re: /highest profit|most profitable|top 10 profitable|ትርፋማ|bu'?aa/i },
  { intent: "getMarginMix", re: /where am i losing|declining profit|high margin|low profit/i },
  { intent: "getSalesmanPerformance", re: /salesman|ሽያጭ ሰራተኛ|best salesman|by salesman|gurgurtoota/i },
  { intent: "getWarehousePerformance", re: /warehouse.*(best|profit|perform)|by warehouse|መጋዘን|kuusaa/i },
  { intent: "getSalesByWarehouse", re: /sales by warehouse|በየመጋዘኑ ሽያጭ/i },
  { intent: "getSalesBySalesman", re: /sales by salesman|ሽያጭ.*ሰራተኛ/i },
  { intent: "getDeadStock", re: /not moving|dead stock|slow.?moving|አልተሸጠ/i },
  { intent: "getFastMovingProducts", re: /fast.?moving|velocity/i },
  { intent: "getLowStockProducts", re: /almost out|low stock|reorder|አለቀ|out of stock/i },
  { intent: "getStockoutRisk", re: /stockout|run out|days remaining/i },
  { intent: "getOverstock", re: /too much stock|overstock|excess inventory/i },
  { intent: "getInventoryValuation", re: /tied up in inventory|inventory value|stock value/i },
  { intent: "getWarehouseStock", re: /how much stock|stock do we have|እንዴት ያህል ስቶክ/i },
  { intent: "getTransferAnalysis", re: /transfer/i },
  { intent: "getPurchaseAnalytics", re: /purchase price|supplier|cost increasing/i },
  { intent: "getPurchaseSummary", re: /how much did we (buy|purchase)|purchases/i },
  { intent: "getProductProfit", re: /profit by product|product profit/i },
  { intent: "getSalesSummary", re: /how much did we sell|ዛሬ ስንት|ሽያጭ|gurgurtaa|today.?sales|profit this month|ትርፌ/i },
];

exports.interpretLocal = (question, filters = {}) => {
  const language = exports.detectLanguage(question);
  const period = filters.period || exports.detectPeriod(question) || "this_month";
  const searchMatch = question.match(
    /salesman\s+([A-Za-z\u1200-\u137F][\w\u1200-\u137F]*)/i,
  );
  let intent = "getSalesSummary";
  let best = 0;
  for (const rule of RULES) {
    if (rule.re.test(question) && rule.re.source.length >= best) {
      intent = rule.intent;
      best = rule.re.source.length;
    }
  }
  if (/ትርፍ|profit this month|የዚህ ወር ትርፍ/.test(question) && !/product|ምርት/.test(question)) {
    intent = "getSalesSummary";
  }
  return {
    intent,
    language,
    filters: {
      period,
      search: searchMatch ? searchMatch[1] : filters.search,
      warehouseId: filters.warehouseId || undefined,
      salesmanId: filters.salesmanId || undefined,
      productId: filters.productId || undefined,
    },
  };
};
