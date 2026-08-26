const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });
const money = Joi.number().min(0).precision(2);
const qty = Joi.number().min(0.001).precision(3);

const itemSchema = Joi.object({
  productId: uuid().required(),
  purchaseOrderItemId: uuid().allow(null),
  quantity: qty.required(),
  unitCost: money.required(),
  batchNumber: Joi.string().trim().max(64).allow("", null),
  expiryDate: Joi.date().iso().allow(null),
});

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  search: Joi.string().trim().max(128).allow(""),
  status: Joi.string().valid("DRAFT", "COMPLETED", "CANCELLED"),
  warehouseId: uuid(),
  purchaseOrderId: uuid(),
});

exports.idParamSchema = Joi.object({ id: uuid().required() });

exports.createSchema = Joi.object({
  warehouseId: uuid().required(),
  purchaseOrderId: uuid().allow(null),
  receiptDate: Joi.date().iso(),
  notes: Joi.string().trim().max(4000).allow("", null),
  items: Joi.array().items(itemSchema).min(1).required(),
});

exports.updateSchema = Joi.object({
  warehouseId: uuid(),
  purchaseOrderId: uuid().allow(null),
  receiptDate: Joi.date().iso(),
  notes: Joi.string().trim().max(4000).allow("", null),
  items: Joi.array().items(itemSchema).min(1),
}).min(1);
