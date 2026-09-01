const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const stockAdjustmentService = require("./stock-adjustment.service");

exports.list = catchAsync(async (req, res) => {
  const result = await stockAdjustmentService.list(req.query, req.user);
  sendSuccess(res, {
    data: { adjustments: result.adjustments },
    meta: result.meta,
    message: "Stock adjustments retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const adjustment = await stockAdjustmentService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { adjustment }, message: "Stock adjustment retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const adjustment = await stockAdjustmentService.create(req.body, req.user);
  sendSuccess(res, {
    data: { adjustment },
    message: "Stock adjustment created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const adjustment = await stockAdjustmentService.update(
    req.params.id,
    req.body,
    req.user,
  );
  sendSuccess(res, { data: { adjustment }, message: "Stock adjustment updated" });
});

exports.complete = catchAsync(async (req, res) => {
  const adjustment = await stockAdjustmentService.complete(
    req.params.id,
    req.user,
  );
  sendSuccess(res, { data: { adjustment }, message: "Stock adjustment completed" });
});

exports.cancel = catchAsync(async (req, res) => {
  const adjustment = await stockAdjustmentService.cancel(req.params.id, req.user);
  sendSuccess(res, { data: { adjustment }, message: "Stock adjustment cancelled" });
});
