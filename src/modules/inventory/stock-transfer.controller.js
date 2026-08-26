const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const stockTransferService = require("./stock-transfer.service");

exports.list = catchAsync(async (req, res) => {
  const result = await stockTransferService.list(req.query, req.user);
  sendSuccess(res, {
    data: { transfers: result.transfers },
    meta: result.meta,
    message: "Stock transfers retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const transfer = await stockTransferService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { transfer }, message: "Stock transfer retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const transfer = await stockTransferService.create(req.body, req.user);
  sendSuccess(res, {
    data: { transfer },
    message: "Stock transfer created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const transfer = await stockTransferService.update(req.params.id, req.body);
  sendSuccess(res, { data: { transfer }, message: "Stock transfer updated" });
});

exports.complete = catchAsync(async (req, res) => {
  const transfer = await stockTransferService.complete(req.params.id, req.user.id);
  sendSuccess(res, { data: { transfer }, message: "Stock transfer completed" });
});

exports.cancel = catchAsync(async (req, res) => {
  const transfer = await stockTransferService.cancel(req.params.id);
  sendSuccess(res, { data: { transfer }, message: "Stock transfer cancelled" });
});
