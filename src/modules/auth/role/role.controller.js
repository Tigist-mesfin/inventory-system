const catchAsync = require("../../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../../shared/helpers/response.helper");
const roleService = require("./role.service");

exports.list = catchAsync(async (req, res) => {
  const result = await roleService.list(req.query);
  sendSuccess(res, {
    data: { roles: result.roles },
    meta: result.meta,
    message: "Roles retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const role = await roleService.getById(req.params.id);
  sendSuccess(res, { data: { role }, message: "Role retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const role = await roleService.create(req.body);
  sendSuccess(res, {
    data: { role },
    message: "Role created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const role = await roleService.update(req.params.id, req.body);
  sendSuccess(res, { data: { role }, message: "Role updated" });
});

exports.setPermissions = catchAsync(async (req, res) => {
  const role = await roleService.setPermissions(
    req.params.id,
    req.body.permissionIds,
  );
  sendSuccess(res, { data: { role }, message: "Role permissions updated" });
});

exports.remove = catchAsync(async (req, res) => {
  await roleService.remove(req.params.id);
  sendSuccess(res, { data: null, message: "Role deleted" });
});
