const catchAsync = require("../../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../../shared/helpers/response.helper");
const permissionService = require("./permission.service");

exports.list = catchAsync(async (req, res) => {
  const result = await permissionService.list(req.query);
  sendSuccess(res, {
    data: { permissions: result.permissions },
    meta: result.meta,
    message: "Permissions retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const permission = await permissionService.getById(req.params.id);
  sendSuccess(res, { data: { permission }, message: "Permission retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const permission = await permissionService.create(req.body);
  sendSuccess(res, {
    data: { permission },
    message: "Permission created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const permission = await permissionService.update(req.params.id, req.body);
  sendSuccess(res, { data: { permission }, message: "Permission updated" });
});

exports.remove = catchAsync(async (req, res) => {
  await permissionService.remove(req.params.id);
  sendSuccess(res, { data: null, message: "Permission deleted" });
});
