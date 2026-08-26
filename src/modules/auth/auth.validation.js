const Joi = require("joi");

const passwordSchema = Joi.string().min(8).max(128).required();

exports.loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(64).required(),
  password: Joi.string().min(1).max(128).required(),
});

exports.registerCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(128).required(),
  phone: Joi.string().trim().min(7).max(32).required(),
  address: Joi.string().trim().max(255).allow("", null),
  password: passwordSchema,
});

exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(128).required(),
  newPassword: passwordSchema,
});
