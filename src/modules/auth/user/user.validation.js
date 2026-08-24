const Joi = require("joi");

const uuid = Joi.string().uuid({ version: "uuidv4" }).required();
const status = Joi.string().valid("ACTIVE", "INACTIVE", "SUSPENDED");
const password = Joi.string().min(8).max(128);

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  search: Joi.string().trim().max(128).allow(""),
  status,
  roleId: Joi.string().uuid({ version: "uuidv4" }),
});

exports.idParamSchema = Joi.object({
  id: uuid,
});

exports.createSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(128).required(),
  username: Joi.string().trim().min(3).max(64).required(),
  phone: Joi.string().trim().min(9).max(20).required(),
  password: password.required(),
  roleId: uuid,
  status,
});

exports.updateSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(128),
  username: Joi.string().trim().min(3).max(64),
  phone: Joi.string().trim().min(9).max(20),
  roleId: Joi.string().uuid({ version: "uuidv4" }),
  status,
}).min(1);

exports.resetPasswordSchema = Joi.object({
  newPassword: password.required(),
});
