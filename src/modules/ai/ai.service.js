const AppError = require("../../shared/errors/AppError");
const env = require("../../config/env");
const tenant = require("../../shared/helpers/tenant.helper");
const analytics = require("./analytics.service");
const { createAIProvider } = require("./providers");
const { TOOLS } = require("./intent.local");
const sqlAssistant = require("./sqlAssistant.service");
const clarifyService = require("./clarify.service");
const summaryService = require("./summary.service");

const provider = createAIProvider();

const TOOL_PERMS = {
  getPurchaseSummary: ["purchasing"],
  getPurchaseAnalytics: ["purchasing"],
  getPurchaseTrend: ["purchasing"],
  getTransferAnalysis: ["inventory"],
  getWarehouseStock: ["inventory"],
  getInventoryValuation: ["inventory"],
  getStockMovement: ["inventory"],
  getLowStockProducts: ["inventory"],
  getDeadStock: ["inventory"],
  getOverstock: ["inventory"],
  getStockoutRisk: ["inventory"],
  getPurchaseRecommendations: ["inventory"],
};

const canUse = (user, intent) => {
  if (tenant.isOwner(user)) return true;
  const moduleName = TOOL_PERMS[intent];
  if (moduleName) return tenant.hasPermission(user, moduleName[0], "READ");
  return (
    tenant.hasPermission(user, "sales", "READ") ||
    tenant.hasPermission(user, "insights", "READ") ||
    tenant.hasPermission(user, "finance", "READ") ||
    tenant.hasPermission(user, "inventory", "READ")
  );
};

exports.chat = async ({ question, filters = {}, mode } = {}, user) => {
  const text = String(question || "").trim();
  if (!text) throw AppError.badRequest("Question is required");
  if (text.length > 800) throw AppError.badRequest("Question is too long");

  // Default: secure Gemini SQL assistant (company-scoped, SELECT-only).
  // mode=tools keeps the older intent/analytics path when explicitly requested.
  const useSqlAssistant =
    mode !== "tools" && (env.GEMINI_API_KEY || mode === "sql");

  if (useSqlAssistant) {
    if (!env.GEMINI_API_KEY) {
      throw AppError.badRequest(
        "Gemini is not configured. Set GEMINI_API_KEY on the server.",
      );
    }
    return sqlAssistant.handleUserAIQuery({
      userQuestion: text,
      user,
    });
  }

  const interpreted = await provider.interpret(text, filters);
  const intent = TOOLS.includes(interpreted.intent)
    ? interpreted.intent
    : "getSalesSummary";

  if (!canUse(user, intent)) {
    return {
      answer: "You do not have permission to view this analysis.",
      keyNumbers: {},
      explanation: "The AI only returns data your role and store assignment allow.",
      recommendation: "Ask your company owner to grant the matching module access.",
      language: interpreted.language,
      intent,
      source: {
        period: null,
        recordsAnalyzed: 0,
        calculation: null,
        lastUpdated: new Date().toISOString(),
      },
      provider: provider.name,
    };
  }

  const fn = analytics.FUNCTIONS[intent];
  const data = await fn({ ...filters, ...interpreted.filters }, user);
  const narrative = await provider.explain(text, data, interpreted.language);
  const missingCost =
    data.costBasis === "estimate" ||
    data.products?.some((row) => row.costBasis === "estimate");

  return {
    answer: narrative.answer,
    keyNumbers: narrative.keyNumbers,
    explanation: missingCost
      ? `${narrative.explanation} Some COGS lines are estimates because a WAC snapshot was missing.`
      : narrative.explanation,
    recommendation: narrative.recommendation,
    language: narrative.language || interpreted.language,
    intent,
    source: data.meta || {
      lastUpdated: new Date().toISOString(),
      recordsAnalyzed: 0,
    },
    provider: provider.name,
  };
};

exports.dashboard = (query, user) => analytics.getInsightsDashboard(query, user);

exports.clarify = ({ rawQuery }, user) =>
  clarifyService.clarifyQuery({ rawQuery, user });

exports.dailySummary = (query, user) => summaryService.getDailySummary(query, user);
exports.monthlySummary = (query, user) => summaryService.getMonthlySummary(query, user);
exports.insightBoard = (query, user) => summaryService.getInsightBoard(query, user);

exports.run = (name, query, user) => {
  const fn = analytics.FUNCTIONS[name];
  if (!fn) throw AppError.notFound("Unknown analytics function");
  if (!canUse(user, name)) {
    throw AppError.forbidden("You do not have permission for this analysis");
  }
  return fn(query, user);
};
