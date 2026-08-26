const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });
const money = Joi.number().min(0).precision(2);
const qty = Joi.number().min(0.001).precision(3);

const itemSchema = Joi.object({
  productId: uuid().required(),
  quantity: qty.required(),
  unitPrice: money,
  discountAmount: money,
});

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  search: Joi.string().trim().max(128).allow(""),
  status: Joi.string().valid("DRAFT", "COMPLETED", "CANCELLED"),
  warehouseId: uuid(),
  customerId: uuid(),
  createdBy: uuid(),
  paymentMethod: Joi.string().trim().max(64),
  paymentStatus: Joi.string().valid("UNPAID", "PARTIAL", "PAID"),
  productId: uuid(),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});

exports.idParamSchema = Joi.object({
  id: uuid().required(),
});

exports.createSchema = Joi.object({
  warehouseId: uuid().required(),
  customerId: uuid().allow(null),
  customerName: Joi.string().trim().max(128).allow("", null),
  customerPhone: Joi.string().trim().max(32).allow("", null),
  saleDate: Joi.date().iso(),
  dueDate: Joi.date().iso().allow(null),
  paymentMethod: Joi.string().trim().max(64).required(),
  taxAmount: money,
  discountAmount: money,
  notes: Joi.string().trim().max(4000).allow("", null),
  channel: Joi.string().trim().max(32).allow("", null),
  items: Joi.array().items(itemSchema).min(1).required(),
});

exports.paySchema = Joi.object({
  amount: Joi.number().min(0.01).precision(2).required(),
  paymentMethod: Joi.string().trim().max(64).required(),
});

exports.updateSchema = Joi.object({
  warehouseId: uuid(),
  customerId: uuid().allow(null),
  customerName: Joi.string().trim().max(128).allow("", null),
  customerPhone: Joi.string().trim().max(32).allow("", null),
  saleDate: Joi.date().iso(),
  dueDate: Joi.date().iso().allow(null),
  paymentMethod: Joi.string().trim().max(64),
  taxAmount: money,
  discountAmount: money,
  notes: Joi.string().trim().max(4000).allow("", null),
  items: Joi.array().items(itemSchema).min(1),
}).min(1);
