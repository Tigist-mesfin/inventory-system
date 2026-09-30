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
  brand: Joi.string().trim().max(64).allow(""),
  size: Joi.string().trim().max(32).allow(""),
  color: Joi.string().trim().max(32).allow(""),
});

exports.idParamSchema = Joi.object({
  id: uuid().required(),
});

exports.historyQuerySchema = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  supplierId: uuid(),
  warehouseId: uuid(),
  customerId: uuid(),
  createdBy: uuid(),
  unitCost: money,
  sellingPrice: money,
});

exports.createSchema = Joi.object({
  categoryId: uuid().allow("", null),
  supplierId: uuid().allow(null),
  sku: Joi.string().trim().min(1).max(64).allow("", null),
  serialNumber: Joi.string().trim().max(64).allow("", null),
  barcode: Joi.string().trim().max(64).allow("", null),
  name: Joi.string().trim().min(1).max(128).required(),
  brand: Joi.string().trim().max(64).allow("", null),
  size: Joi.string().trim().max(32).allow("", null),
  color: Joi.string().trim().max(32).allow("", null),
  description: Joi.string().trim().max(4000).allow("", null),
  unit: Joi.string().trim().min(1).max(32).required(),
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
  serialNumber: Joi.string().trim().max(64).allow("", null),
  barcode: Joi.string().trim().max(64).allow("", null),
  name: Joi.string().trim().min(1).max(128),
  brand: Joi.string().trim().max(64).allow("", null),
  size: Joi.string().trim().max(32).allow("", null),
  color: Joi.string().trim().max(32).allow("", null),
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
