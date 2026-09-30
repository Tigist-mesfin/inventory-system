const Joi = require("joi");

const uuid = Joi.string().uuid({ version: "uuidv4" }).required();

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  search: Joi.string().trim().max(128).allow(""),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
});

exports.idParamSchema = Joi.object({
  id: uuid,
});

exports.createSchema = Joi.object({
  name: Joi.string().trim().min(1).max(128).required(),
  description: Joi.string().trim().max(2000).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
});

exports.updateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(128),
  description: Joi.string().trim().max(2000).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
}).min(1);
