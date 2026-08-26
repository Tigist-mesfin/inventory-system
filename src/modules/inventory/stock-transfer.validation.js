const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });
const qty = Joi.number().min(0.001).precision(3);

const itemSchema = Joi.object({
  productId: uuid().required(),
  quantity: qty.required(),
});

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  search: Joi.string().trim().max(128).allow(""),
  status: Joi.string().valid("DRAFT", "COMPLETED", "CANCELLED"),
  sourceWarehouseId: uuid(),
  destinationWarehouseId: uuid(),
});

exports.idParamSchema = Joi.object({ id: uuid().required() });

exports.createSchema = Joi.object({
  sourceWarehouseId: uuid().required(),
  destinationWarehouseId: uuid().required(),
  transferDate: Joi.date().iso(),
  notes: Joi.string().trim().max(4000).allow("", null),
  items: Joi.array().items(itemSchema).min(1).required(),
});

exports.updateSchema = Joi.object({
  sourceWarehouseId: uuid(),
  destinationWarehouseId: uuid(),
  transferDate: Joi.date().iso(),
  notes: Joi.string().trim().max(4000).allow("", null),
  items: Joi.array().items(itemSchema).min(1),
}).min(1);
