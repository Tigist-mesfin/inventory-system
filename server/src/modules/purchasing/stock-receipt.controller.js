const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const stockReceiptService = require("./stock-receipt.service");

exports.list = catchAsync(async (req, res) => {
  const result = await stockReceiptService.list(req.query, req.user);
  sendSuccess(res, {
    data: { receipts: result.receipts },
    meta: result.meta,
    message: "Stock receipts retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const receipt = await stockReceiptService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { receipt }, message: "Stock receipt retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const receipt = await stockReceiptService.create(req.body, req.user);
  sendSuccess(res, {
    data: { receipt },
    message: "Stock receipt created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const receipt = await stockReceiptService.update(req.params.id, req.body, req.user);
  sendSuccess(res, { data: { receipt }, message: "Stock receipt updated" });
});

exports.complete = catchAsync(async (req, res) => {
  const receipt = await stockReceiptService.complete(req.params.id, req.user);
  sendSuccess(res, { data: { receipt }, message: "Stock receipt completed" });
});

exports.cancel = catchAsync(async (req, res) => {
  const receipt = await stockReceiptService.cancel(req.params.id, req.user);
  sendSuccess(res, { data: { receipt }, message: "Stock receipt cancelled" });
});
