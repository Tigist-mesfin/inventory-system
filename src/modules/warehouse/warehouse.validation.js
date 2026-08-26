const Joi = require("joi");

const uuid = Joi.string().uuid({ version: "uuidv4" }).required();

const addressSchema = Joi.object({
  street: Joi.string().trim().max(256).allow("", null),
  city: Joi.string().trim().max(128).allow("", null),
  region: Joi.string().trim().max(128).allow("", null),
  notes: Joi.string().trim().max(512).allow("", null),
}).unknown(true);

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
  code: Joi.string().trim().max(32).allow("", null),
  address: addressSchema.allow(null),
  managerName: Joi.string().trim().max(128).allow("", null),
  phone: Joi.string().trim().max(32).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
});

exports.updateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(128),
  code: Joi.string().trim().min(1).max(32),
  address: addressSchema.allow(null),
  managerName: Joi.string().trim().max(128).allow("", null),
  phone: Joi.string().trim().max(32).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
}).min(1);
