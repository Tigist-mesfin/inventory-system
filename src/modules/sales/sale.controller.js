const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const saleService = require("./sale.service");

exports.list = catchAsync(async (req, res) => {
  const result = await saleService.list(req.query, req.user);
  sendSuccess(res, {
    data: { sales: result.sales },
    meta: result.meta,
    message: "Sales retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const sale = await saleService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { sale }, message: "Sale retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const sale = await saleService.create(req.body, req.user);
  sendSuccess(res, {
    data: { sale },
    message: "Sale created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const sale = await saleService.update(req.params.id, req.body);
  sendSuccess(res, { data: { sale }, message: "Sale updated" });
});

exports.complete = catchAsync(async (req, res) => {
  const sale = await saleService.complete(req.params.id, req.user.id, req.body);
  sendSuccess(res, { data: { sale }, message: "Sale completed" });
});

exports.recordPayment = catchAsync(async (req, res) => {
  const sale = await saleService.recordPayment(req.params.id, req.body, req.user.id);
  sendSuccess(res, { data: { sale }, message: "Sale payment recorded" });
});

exports.cancel = catchAsync(async (req, res) => {
  const sale = await saleService.cancel(req.params.id);
  sendSuccess(res, { data: { sale }, message: "Sale cancelled" });
});

exports.quote = catchAsync(async (req, res) => {
  const quote = await saleService.quote(req.query);
  sendSuccess(res, { data: { quote }, message: "Price quoted" });
});
