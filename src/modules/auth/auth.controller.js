const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const {
  setAuthCookies,
  clearAuthCookies,
} = require("../../shared/helpers/cookie.helper");
const authService = require("./auth.service");

exports.login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  sendSuccess(res, {
    data: { user: result.user },
    message: "Logged in successfully",
  });
});

exports.refresh = catchAsync(async (req, res) => {
  const result = await authService.refresh(req.cookies?.refreshToken);
  setAuthCookies(res, { accessToken: result.accessToken });
  sendSuccess(res, {
    data: null,
    message: "Token refreshed",
  });
});

exports.logout = catchAsync(async (req, res) => {
  clearAuthCookies(res);
  sendSuccess(res, {
    data: null,
    message: "Logged out successfully",
  });
});

exports.me = catchAsync(async (req, res) => {
  const user = await authService.me(req.user.id);
  sendSuccess(res, {
    data: { user },
    message: "Success",
  });
});

exports.changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  sendSuccess(res, {
    data: null,
    message: "Password changed successfully",
  });
});
