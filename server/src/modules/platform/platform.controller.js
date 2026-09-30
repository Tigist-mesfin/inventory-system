const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const platformService = require("./platform.service");
const platformSmsService = require("./platform.sms.service");

exports.overview = catchAsync(async (req, res) => {
  const data = await platformService.getOverview(req.query);
  sendSuccess(res, { data, message: "Platform overview retrieved" });
});

exports.companies = catchAsync(async (req, res) => {
  const data = await platformService.listCompanies(req.query);
  sendSuccess(res, { data, message: "Companies retrieved" });
});

exports.performance = catchAsync(async (req, res) => {
  const data = await platformService.getPerformance(req.query);
  sendSuccess(res, { data, message: "Company performance retrieved" });
});

exports.owners = catchAsync(async (req, res) => {
  const data = await platformService.listOwners(req.query);
  sendSuccess(res, { data, message: "Company owners retrieved" });
});

exports.sendCompanySms = catchAsync(async (req, res) => {
  const data = await platformSmsService.sendSingleCompanySms({
    companyId: req.params.companyId,
    title: req.body.title,
    body: req.body.body,
  });
  sendSuccess(res, { data, message: "SMS sent" });
});

exports.bulkCompanySms = catchAsync(async (req, res) => {
  const data = await platformSmsService.enqueueBulkCompanySms({
    title: req.body.title,
    body: req.body.body,
    status: req.body.status,
  });
  sendSuccess(res, { data, message: "Bulk SMS queued" });
});

exports.smsJob = catchAsync(async (req, res) => {
  const data = platformSmsService.getSmsJob(req.params.jobId);
  sendSuccess(res, { data, message: "SMS job retrieved" });
});
