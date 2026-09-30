const catchAsync = require("../../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../../shared/helpers/response.helper");
const userService = require("./user.service");

exports.list = catchAsync(async (req, res) => {
  const result = await userService.list(req.query, req.user);
  sendSuccess(res, {
    data: { users: result.users },
    meta: result.meta,
    message: "Users retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const user = await userService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { user }, message: "User retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const user = await userService.create(req.body, req.user);
  sendSuccess(res, {
    data: { user },
    message: "User created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const user = await userService.update(req.params.id, req.body, req.user);
  sendSuccess(res, { data: { user }, message: "User updated" });
});

exports.resetPassword = catchAsync(async (req, res) => {
  await userService.resetPassword(req.params.id, req.body.newPassword, req.user);
  sendSuccess(res, {
    data: null,
    message: "Password reset successfully",
  });
});

exports.remove = catchAsync(async (req, res) => {
  await userService.remove(req.params.id, req.user);
  sendSuccess(res, { data: null, message: "User deleted" });
});
