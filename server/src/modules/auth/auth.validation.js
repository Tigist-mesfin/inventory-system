const Joi = require("joi");

/** Company registration allows short passwords (min 4). */
const registerPasswordSchema = Joi.string().min(4).max(128).required().messages({
  "string.min": "Password must be at least 4 characters",
});
const passwordSchema = Joi.string().min(4).max(128).required().messages({
  "string.min": "Password must be at least 4 characters",
});
const phoneSchema = Joi.string().trim().min(7).max(32).required();
const otpSchema = Joi.string().trim().pattern(/^\d{4}$/).required().messages({
  "string.pattern.base": "OTP must be a 4-digit code",
});

exports.loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(64).required(),
  password: Joi.string().min(1).max(128).required(),
});

exports.registerCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(128).required(),
  phone: phoneSchema,
  address: Joi.string().trim().max(255).allow("", null),
  password: registerPasswordSchema,
});

exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(128).required(),
  newPassword: passwordSchema,
});

exports.phoneOnlySchema = Joi.object({
  phone: phoneSchema,
});

exports.verifyOtpSchema = Joi.object({
  phone: phoneSchema,
  otp: otpSchema,
});

exports.resetPasswordSchema = Joi.object({
  resetToken: Joi.string().trim().min(10).required(),
  newPassword: passwordSchema,
});

/** Self-service account deletion (App Store 5.1.1(v)). */
exports.deleteAccountSchema = Joi.object({
  password: Joi.string().min(1).max(128).required(),
  confirm: Joi.string().valid("DELETE").required().messages({
    "any.only": 'Type DELETE to confirm permanent account deletion',
  }),
});
