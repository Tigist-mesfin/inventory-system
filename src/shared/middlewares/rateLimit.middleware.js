const rateLimit = require("express-rate-limit");

const handler = (req, res) => {
  res.status(429).json({
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests, please try again later.",
    },
  });
};

const skipInTest = () => process.env.NODE_ENV === "test";

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skip: skipInTest,
};

exports.loginLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

exports.refreshLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

exports.publicOrderLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});

exports.aiChatLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 20,
});

/** HTTP-level guard for OTP send endpoints (pair with otp.service resend cooldown). */
exports.otpSendLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

/** HTTP-level guard for OTP verify endpoints (pair with otp.service attempt limits). */
exports.otpVerifyLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
});
