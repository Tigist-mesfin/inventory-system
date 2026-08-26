const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const orderService = require("./customer-order.service");

exports.listCatalog = catchAsync(async (req, res) => {
  const products = await orderService.listCatalog(
    req.query.companyId || req.user?.companyId,
  );
  sendSuccess(res, { data: { products }, message: "Available items retrieved" });
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

exports.updatePending = catchAsync(async (req, res) => {
  const order = await orderService.updatePending(req.params.id, req.body);
  sendSuccess(res, { data: { order }, message: "Order updated" });
});

exports.approve = catchAsync(async (req, res) => {
  const order = await orderService.approve(req.params.id, req.body, req.user.id);
  sendSuccess(res, { data: { order }, message: "Order approved and sold" });
});

exports.updateStatus = catchAsync(async (req, res) => {
  const order = await orderService.updateStatus(req.params.id, req.body);
  sendSuccess(res, { data: { order }, message: "Order status updated" });
});

exports.recordPayment = catchAsync(async (req, res) => {
  const order = await orderService.recordPayment(req.params.id, req.body);
  sendSuccess(res, { data: { order }, message: "Payment recorded" });
});
