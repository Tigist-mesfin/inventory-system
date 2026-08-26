const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const expenseService = require("./expense.service");

exports.list = catchAsync(async (req, res) => {
  const result = await expenseService.list(req.query, req.user);
  sendSuccess(res, {
    data: { expenses: result.expenses },
    meta: result.meta,
    message: "Expenses retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const expense = await expenseService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { expense }, message: "Expense retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const expense = await expenseService.create(req.body, req.user);
  sendSuccess(res, {
    data: { expense },
    message: "Expense recorded",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const expense = await expenseService.update(req.params.id, req.body, req.user);
  sendSuccess(res, { data: { expense }, message: "Expense updated" });
});

exports.remove = catchAsync(async (req, res) => {
  await expenseService.remove(req.params.id, req.user);
  sendSuccess(res, { data: null, message: "Expense deleted" });
});

exports.report = catchAsync(async (req, res) => {
  const report = await expenseService.report(req.query, req.user);
  sendSuccess(res, { data: { report }, message: "Expense report retrieved" });
});

exports.incomeStatement = catchAsync(async (req, res) => {
  const statement = await expenseService.incomeStatement(req.query, req.user);
  sendSuccess(res, {
    data: { statement },
    message: "Income statement retrieved",
  });
});
