const Joi = require("joi");

const passwordSchema = Joi.string().min(8).max(128).required();

exports.loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(64).required(),
  password: Joi.string().min(1).max(128).required(),
});

exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(128).required(),
  newPassword: passwordSchema,
});
