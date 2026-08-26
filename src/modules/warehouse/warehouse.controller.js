const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const warehouseService = require("./warehouse.service");

exports.list = catchAsync(async (req, res) => {
  const result = await warehouseService.list(req.query, req.user);
  sendSuccess(res, {
    data: { warehouses: result.warehouses },
    meta: result.meta,
    message: "Warehouses retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const warehouse = await warehouseService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { warehouse }, message: "Warehouse retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const warehouse = await warehouseService.create(req.body, req.user);
  sendSuccess(res, {
    data: { warehouse },
    message: "Warehouse created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const warehouse = await warehouseService.update(req.params.id, req.body, req.user);
  sendSuccess(res, { data: { warehouse }, message: "Warehouse updated" });
});

exports.remove = catchAsync(async (req, res) => {
  await warehouseService.remove(req.params.id, req.user);
  sendSuccess(res, { data: null, message: "Warehouse deleted" });
});
