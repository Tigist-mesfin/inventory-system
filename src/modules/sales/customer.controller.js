const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const customerService = require("./customer.service");

exports.list = catchAsync(async (req, res) => {
  const result = await customerService.list(req.query, req.user);
  sendSuccess(res, {
    data: { customers: result.customers },
    meta: result.meta,
    message: "Customers retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const customer = await customerService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { customer }, message: "Customer retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const customer = await customerService.create(req.body, req.user);
  sendSuccess(res, {
    data: { customer },
    message: "Customer created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const customer = await customerService.update(req.params.id, req.body);
  sendSuccess(res, { data: { customer }, message: "Customer updated" });
});

exports.remove = catchAsync(async (req, res) => {
  await customerService.remove(req.params.id);
  sendSuccess(res, { data: null, message: "Customer deleted" });
});

exports.setPrices = catchAsync(async (req, res) => {
  const prices = await customerService.setPrices(req.params.id, req.body.prices);
  sendSuccess(res, { data: { prices }, message: "Customer prices saved" });
});

exports.recordPayment = catchAsync(async (req, res) => {
  const payment = await customerService.recordPayment(
    req.params.id,
    req.body,
    req.user,
  );
  sendSuccess(res, {
    data: { payment },
    message: "Payment recorded",
    statusCode: 201,
  });
});
