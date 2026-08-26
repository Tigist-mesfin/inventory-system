const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const inventoryService = require("./inventory.service");

exports.list = catchAsync(async (req, res) => {
  const result = await inventoryService.list(req.query, req.user);
  sendSuccess(res, {
    data: { inventory: result.inventory },
    meta: result.meta,
    message: "Inventory retrieved",
  });
});

exports.overview = catchAsync(async (req, res) => {
  const overview = await inventoryService.overview(req.user);
  sendSuccess(res, { data: { overview }, message: "Stock overview retrieved" });
});

exports.getById = catchAsync(async (req, res) => {
  const inventory = await inventoryService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { inventory }, message: "Inventory retrieved" });
});
