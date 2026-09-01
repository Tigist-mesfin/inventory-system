const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const orderService = require("./customer-order.service");

exports.listCatalog = catchAsync(async (req, res) => {
  const products = await orderService.listCatalog(req.user?.companyId);
  sendSuccess(res, { data: { products }, message: "Available items retrieved" });
});

exports.listCustomers = catchAsync(async (req, res) => {
  const customerService = require("./customer.service");
  const result = await customerService.listForPicker(req.query, req.user);
  sendSuccess(res, {
    data: { customers: result.customers },
    meta: result.meta,
    message: "Customers retrieved",
  });
});

exports.create = catchAsync(async (req, res) => {
  const order = await orderService.create(req.body, req.user);
  sendSuccess(res, {
    data: { order },
    message: "Customer order created",
    statusCode: 201,
  });
});

exports.list = catchAsync(async (req, res) => {
  const result = await orderService.list(req.query, req.user);
  sendSuccess(res, {
    data: { orders: result.orders },
    meta: result.meta,
    message: "Orders retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const order = await orderService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { order }, message: "Order retrieved" });
});

exports.getPublicProforma = catchAsync(async (req, res) => {
  const result = await orderService.getPublicProforma(req.params.token);
  sendSuccess(res, { data: result, message: "Proforma retrieved" });
});

exports.updatePending = catchAsync(async (req, res) => {
  const order = await orderService.updatePending(req.params.id, req.body, req.user);
  sendSuccess(res, { data: { order }, message: "Order updated" });
});

exports.approve = catchAsync(async (req, res) => {
  const order = await orderService.approve(req.params.id, req.body, req.user);
  sendSuccess(res, { data: { order }, message: "Order added to sales" });
});

exports.updateStatus = catchAsync(async (req, res) => {
  const order = await orderService.updateStatus(req.params.id, req.body, req.user);
  sendSuccess(res, { data: { order }, message: "Order status updated" });
});

exports.recordPayment = catchAsync(async (req, res) => {
  const order = await orderService.recordPayment(req.params.id, req.body, req.user);
  sendSuccess(res, { data: { order }, message: "Payment recorded" });
});
