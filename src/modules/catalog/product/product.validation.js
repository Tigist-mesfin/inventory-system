const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });
const money = Joi.number().min(0).precision(2);
const qty = Joi.number().min(0).precision(3);

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  search: Joi.string().trim().max(128).allow(""),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
  categoryId: uuid(),
  supplierId: uuid(),
});

exports.idParamSchema = Joi.object({
  id: uuid().required(),
});

exports.createSchema = Joi.object({
  categoryId: uuid().required(),
  supplierId: uuid().allow(null),
  sku: Joi.string().trim().min(1).max(64).required(),
  barcode: Joi.string().trim().max(64).allow("", null),
  name: Joi.string().trim().min(1).max(128).required(),
  description: Joi.string().trim().max(4000).allow("", null),
  unit: Joi.string().trim().min(1).max(32),
  purchasePrice: money,
  sellingPrice: money,
  reorderLevel: qty,
  reorderQuantity: qty,
  trackBatch: Joi.boolean(),
  trackExpiry: Joi.boolean(),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
});

exports.updateSchema = Joi.object({
  categoryId: uuid(),
  supplierId: uuid().allow(null),
  sku: Joi.string().trim().min(1).max(64),
  barcode: Joi.string().trim().max(64).allow("", null),
  name: Joi.string().trim().min(1).max(128),
  description: Joi.string().trim().max(4000).allow("", null),
  unit: Joi.string().trim().min(1).max(32),
  purchasePrice: money,
  sellingPrice: money,
  reorderLevel: qty,
  reorderQuantity: qty,
  trackBatch: Joi.boolean(),
  trackExpiry: Joi.boolean(),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
}).min(1);
