const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const aiService = require("./ai.service");

exports.chat = catchAsync(async (req, res) => {
  const result = await aiService.chat(req.body, req.user);
  sendSuccess(res, { data: { chat: result }, message: "AI answer ready" });
});

exports.clarify = catchAsync(async (req, res) => {
  const result = await aiService.clarify(req.body, req.user);
  sendSuccess(res, {
    data: { clarify: result },
    message: "Clarified question candidates ready",
  });
});

exports.dailySummary = catchAsync(async (req, res) => {
  const summary = await aiService.dailySummary(req.query, req.user);
  sendSuccess(res, { data: { summary }, message: "Daily AI summary ready" });
});

exports.monthlySummary = catchAsync(async (req, res) => {
  const summary = await aiService.monthlySummary(req.query, req.user);
  sendSuccess(res, { data: { summary }, message: "Monthly AI summary ready" });
});

exports.insightBoard = catchAsync(async (req, res) => {
  const board = await aiService.insightBoard(req.query, req.user);
  sendSuccess(res, { data: { board }, message: "AI insights ready" });
});

exports.dashboard = catchAsync(async (req, res) => {
  const dashboard = await aiService.dashboard(req.query, req.user);
  sendSuccess(res, { data: { dashboard }, message: "AI dashboard retrieved" });
});

exports.profitProducts = catchAsync(async (req, res) => {
  const data = await aiService.run("getTopProfitableProducts", req.query, req.user);
  sendSuccess(res, { data, message: "Product profit retrieved" });
});

exports.lossProducts = catchAsync(async (req, res) => {
  const data = await aiService.run("getLossMakingProducts", req.query, req.user);
  sendSuccess(res, { data, message: "Loss-making products retrieved" });
});

exports.profitWarehouses = catchAsync(async (req, res) => {
  const data = await aiService.run("getWarehousePerformance", req.query, req.user);
  sendSuccess(res, { data, message: "Warehouse profit retrieved" });
});

exports.profitSalesmen = catchAsync(async (req, res) => {
  const data = await aiService.run("getSalesmanPerformance", req.query, req.user);
  sendSuccess(res, { data, message: "Salesman profit retrieved" });
});

exports.sales = catchAsync(async (req, res) => {
  const data = await aiService.run("getSalesSummary", req.query, req.user);
  sendSuccess(res, { data, message: "Sales analytics retrieved" });
});

exports.inventory = catchAsync(async (req, res) => {
  const data = await aiService.run("getInventoryValuation", req.query, req.user);
  sendSuccess(res, { data, message: "Inventory analytics retrieved" });
});

exports.stockRisk = catchAsync(async (req, res) => {
  const data = await aiService.run("getStockoutRisk", req.query, req.user);
  sendSuccess(res, { data, message: "Stock risk retrieved" });
});

exports.deadStock = catchAsync(async (req, res) => {
  const data = await aiService.run("getDeadStock", req.query, req.user);
  sendSuccess(res, { data, message: "Dead stock retrieved" });
});

exports.purchase = catchAsync(async (req, res) => {
  const data = await aiService.run("getPurchaseAnalytics", req.query, req.user);
  sendSuccess(res, { data, message: "Purchase analytics retrieved" });
});

exports.transfers = catchAsync(async (req, res) => {
  const data = await aiService.run("getTransferAnalysis", req.query, req.user);
  sendSuccess(res, { data, message: "Transfer analytics retrieved" });
});
