const catchAsync = require("../../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../../shared/helpers/response.helper");
const rolePermissionService = require("./role-permission.service");

exports.list = catchAsync(async (req, res) => {
  const result = await rolePermissionService.list(req.query);
  sendSuccess(res, {
    data: { rolePermissions: result.rolePermissions },
    meta: result.meta,
    message: "Role permissions retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const rolePermission = await rolePermissionService.getById(req.params.id);
  sendSuccess(res, {
    data: { rolePermission },
    message: "Role permission retrieved",
  });
});

exports.assign = catchAsync(async (req, res) => {
  const rolePermission = await rolePermissionService.assign(req.body);
  sendSuccess(res, {
    data: { rolePermission },
    message: "Permission assigned",
    statusCode: 201,
  });
});

exports.remove = catchAsync(async (req, res) => {
  await rolePermissionService.remove(req.params.id);
  sendSuccess(res, { data: null, message: "Permission unassigned" });
});
