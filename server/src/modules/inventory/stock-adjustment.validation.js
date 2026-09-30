const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });
const qty = Joi.number().min(0).precision(3);

const itemSchema = Joi.object({
  productId: uuid().required(),
  actualQuantity: qty.required(),
  reason: Joi.string().trim().max(1000).allow("", null),
});

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  search: Joi.string().trim().max(128).allow(""),
  status: Joi.string().valid("DRAFT", "COMPLETED", "CANCELLED"),
  warehouseId: uuid(),
});

exports.idParamSchema = Joi.object({ id: uuid().required() });

exports.createSchema = Joi.object({
  warehouseId: uuid().required(),
  reason: Joi.string().trim().min(1).max(2000).required(),
  adjustmentDate: Joi.date().iso(),
  notes: Joi.string().trim().max(4000).allow("", null),
  items: Joi.array().items(itemSchema).min(1).required(),
});

exports.updateSchema = Joi.object({
  warehouseId: uuid(),
  reason: Joi.string().trim().min(1).max(2000),
  adjustmentDate: Joi.date().iso(),
  notes: Joi.string().trim().max(4000).allow("", null),
  items: Joi.array().items(itemSchema).min(1),
}).min(1);
