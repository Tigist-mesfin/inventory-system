const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const insightsService = require("./insights.service");

exports.dashboard = catchAsync(async (req, res) => {
  const dashboard = await insightsService.dashboard(req.user);
  sendSuccess(res, { data: { dashboard }, message: "Dashboard retrieved" });
});

exports.marketplace = catchAsync(async (req, res) => {
  const listings = await insightsService.marketplace(req.query, req.user);
  sendSuccess(res, { data: { listings }, message: "Marketplace results retrieved" });
});

exports.salesReport = catchAsync(async (req, res) => {
  const report = await insightsService.salesReport(req.query, req.user);
  sendSuccess(res, { data: { report }, message: "Sales report retrieved" });
});

exports.ledger = catchAsync(async (req, res) => {
  const ledger = await insightsService.ledger(req.user);
  sendSuccess(res, { data: { ledger }, message: "Debit and credit retrieved" });
});

exports.purchasesReport = catchAsync(async (req, res) => {
  const report = await insightsService.purchasesReport(req.query, req.user);
  sendSuccess(res, { data: { report }, message: "Purchases report retrieved" });
});
