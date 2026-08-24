const Joi = require("joi");

const uuid = Joi.string().uuid({ version: "uuidv4" }).required();

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  roleId: Joi.string().uuid({ version: "uuidv4" }),
  permissionId: Joi.string().uuid({ version: "uuidv4" }),
});

exports.idParamSchema = Joi.object({
  id: uuid,
});

exports.createSchema = Joi.object({
  roleId: uuid,
  permissionId: uuid,
});
