const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const {
  setAuthCookies,
  clearAuthCookies,
} = require("../../shared/helpers/cookie.helper");
const authService = require("./auth.service");

exports.registerCompany = catchAsync(async (req, res) => {
  const result = await authService.registerCompany(req.body);
  sendSuccess(res, {
    data: result,
    message: "Registration started. Verify the OTP sent to your phone.",
    statusCode: 201,
  });
});

exports.verifyRegistrationOtp = catchAsync(async (req, res) => {
  const result = await authService.verifyRegistrationOtp(req.body);
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
    message: "Registration verified",
  });
});

exports.resendRegistrationOtp = catchAsync(async (req, res) => {
  const result = await authService.resendRegistrationOtp(req.body);
  sendSuccess(res, {
    data: result,
    message: "OTP resent",
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

exports.requestLoginOtp = catchAsync(async (req, res) => {
  const result = await authService.requestLoginOtp(req.body);
  sendSuccess(res, {
    data: result,
    message: "OTP sent",
  });
});

exports.verifyLoginOtp = catchAsync(async (req, res) => {
  const result = await authService.verifyLoginOtp(req.body);
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

exports.forgotPassword = catchAsync(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  sendSuccess(res, {
    data: result,
    message: "Password reset OTP sent",
  });
});

exports.verifyPasswordResetOtp = catchAsync(async (req, res) => {
  const result = await authService.verifyPasswordResetOtp(req.body);
  sendSuccess(res, {
    data: result,
    message: "OTP verified. You may reset your password.",
  });
});

exports.resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body);
  sendSuccess(res, {
    data: null,
    message: "Password reset successfully",
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
