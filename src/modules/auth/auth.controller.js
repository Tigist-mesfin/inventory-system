const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const {
  setAuthCookies,
  clearAuthCookies,
} = require("../../shared/helpers/cookie.helper");
const authService = require("./auth.service");

exports.registerCompany = catchAsync(async (req, res) => {
  const result = await authService.registerCompany(req.body);
  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  sendSuccess(res, {
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
    message: "Company registered",
    statusCode: 201,
  });
});

exports.login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  sendSuccess(res, {
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
    message: "Logged in successfully",
  });
});

exports.refresh = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await authService.refresh(refreshToken);
  setAuthCookies(res, { accessToken: result.accessToken });
  sendSuccess(res, {
    data: { accessToken: result.accessToken },
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
