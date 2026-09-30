const Joi = require("joi");

const ACTIONS = ["CREATE", "READ", "UPDATE", "DELETE", "APPROVE", "EXPORT"];
const MODULES = [
  "auth",
  "catalog",
  "warehouse",
  "inventory",
  "purchasing",
  "sales",
  "audit",
];

const uuid = Joi.string().uuid({ version: "uuidv4" }).required();

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  search: Joi.string().trim().max(128).allow(""),
  module: Joi.string().valid(...MODULES),
  action: Joi.string().valid(...ACTIONS),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
});

exports.idParamSchema = Joi.object({
  id: uuid,
});

exports.createSchema = Joi.object({
  module: Joi.string()
    .trim()
    .lowercase()
    .valid(...MODULES)
    .required(),
  action: Joi.string()
    .valid(...ACTIONS)
    .required(),
  description: Joi.string().trim().max(500).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
});

exports.updateSchema = Joi.object({
  description: Joi.string().trim().max(500).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
}).min(1);
