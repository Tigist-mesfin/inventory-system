const catchAsync = require("../../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../../shared/helpers/response.helper");
const supplierService = require("./supplier.service");

exports.list = catchAsync(async (req, res) => {
  const result = await supplierService.list(req.query);
  sendSuccess(res, {
    data: { suppliers: result.suppliers },
    meta: result.meta,
    message: "Suppliers retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const supplier = await supplierService.getById(req.params.id);
  sendSuccess(res, { data: { supplier }, message: "Supplier retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const supplier = await supplierService.create(req.body);
  sendSuccess(res, {
    data: { supplier },
    message: "Supplier created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const supplier = await supplierService.update(req.params.id, req.body);
  sendSuccess(res, { data: { supplier }, message: "Supplier updated" });
});

exports.remove = catchAsync(async (req, res) => {
  await supplierService.remove(req.params.id);
  sendSuccess(res, { data: null, message: "Supplier deleted" });
});
