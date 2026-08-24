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
  name: Joi.string().trim().min(2).max(64).uppercase().required(),
  description: Joi.string().trim().max(500).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
  permissionIds: Joi.array().items(Joi.string().uuid({ version: "uuidv4" })),
});

exports.updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(64).uppercase(),
  description: Joi.string().trim().max(500).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
}).min(1);

exports.setPermissionsSchema = Joi.object({
  permissionIds: Joi.array()
    .items(Joi.string().uuid({ version: "uuidv4" }))
    .required(),
});
