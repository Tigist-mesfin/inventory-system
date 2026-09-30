const router = require("express").Router();

const { validateBody } = require("../../shared/middlewares/validate.wrapper");
const {
  loginLimiter,
  refreshLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
} = require("../../shared/middlewares/rateLimit.middleware");
const authenticate = require("./auth.middleware");
const controller = require("./auth.controller");
const {
  loginSchema,
  changePasswordSchema,
  registerCompanySchema,
  phoneOnlySchema,
  verifyOtpSchema,
  resetPasswordSchema,
  deleteAccountSchema,
} = require("./auth.validation");

router.post(
  "/register-company",
  loginLimiter,
  validateBody(registerCompanySchema),
  controller.registerCompany,
);

router.post(
  "/register-company/verify-otp",
  otpVerifyLimiter,
  validateBody(verifyOtpSchema),
  controller.verifyRegistrationOtp,
);

router.post(
  "/register-company/resend-otp",
  otpSendLimiter,
  validateBody(phoneOnlySchema),
  controller.resendRegistrationOtp,
);

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  controller.login,
);

router.post(
  "/login/otp/request",
  otpSendLimiter,
  validateBody(phoneOnlySchema),
  controller.requestLoginOtp,
);

router.post(
  "/login/otp/verify",
  otpVerifyLimiter,
  validateBody(verifyOtpSchema),
  controller.verifyLoginOtp,
);

router.post(
  "/forgot-password",
  otpSendLimiter,
  validateBody(phoneOnlySchema),
  controller.forgotPassword,
);

router.post(
  "/forgot-password/verify-otp",
  otpVerifyLimiter,
  validateBody(verifyOtpSchema),
  controller.verifyPasswordResetOtp,
);

router.post(
  "/reset-password",
  loginLimiter,
  validateBody(resetPasswordSchema),
  controller.resetPassword,
);

router.post("/refresh", refreshLimiter, controller.refresh);

router.post("/logout", controller.logout);

router.get("/me", authenticate, controller.me);

router.post(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  controller.changePassword,
);

router.post(
  "/delete-account",
  authenticate,
  validateBody(deleteAccountSchema),
  controller.deleteAccount,
);

module.exports = router;
