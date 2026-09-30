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
  contactPerson: Joi.string().trim().max(128).allow("", null),
  email: Joi.string().trim().email().allow("", null),
  phone: Joi.string().trim().max(32).allow("", null),
  address: Joi.object().unknown(true).allow(null),
  paymentTerms: Joi.string().trim().max(128).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
});

exports.updateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(128),
  contactPerson: Joi.string().trim().max(128).allow("", null),
  email: Joi.string().trim().email().allow("", null),
  phone: Joi.string().trim().max(32).allow("", null),
  address: Joi.object().unknown(true).allow(null),
  paymentTerms: Joi.string().trim().max(128).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
}).min(1);
