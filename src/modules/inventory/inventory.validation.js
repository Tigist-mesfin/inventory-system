const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(200),
  search: Joi.string().trim().max(128).allow(""),
  warehouseId: uuid(),
  productId: uuid(),
  brand: Joi.string().trim().max(64).allow(""),
  size: Joi.string().trim().max(32).allow(""),
  color: Joi.string().trim().max(32).allow(""),
  lowStock: Joi.boolean(),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});

exports.idParamSchema = Joi.object({
  id: uuid().required(),
});
