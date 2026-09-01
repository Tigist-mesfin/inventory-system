const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const otherIncomeService = require("./other-income.service");

exports.list = catchAsync(async (req, res) => {
  const result = await otherIncomeService.list(req.query, req.user);
  sendSuccess(res, {
    data: { incomes: result.incomes },
    meta: result.meta,
    message: "Other income retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const income = await otherIncomeService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { income }, message: "Other income retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const income = await otherIncomeService.create(req.body, req.user);
  sendSuccess(res, {
    data: { income },
    message: "Other income recorded",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const income = await otherIncomeService.update(
    req.params.id,
    req.body,
    req.user,
  );
  sendSuccess(res, { data: { income }, message: "Other income updated" });
});

exports.remove = catchAsync(async (req, res) => {
  await otherIncomeService.remove(req.params.id, req.user);
  sendSuccess(res, { data: null, message: "Other income deleted" });
});

exports.report = catchAsync(async (req, res) => {
  const report = await otherIncomeService.report(req.query, req.user);
  sendSuccess(res, {
    data: { report },
    message: "Other income report retrieved",
  });
});
