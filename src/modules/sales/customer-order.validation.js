const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });
const money = Joi.number().min(0).precision(2);
const qty = Joi.number().min(0.001).precision(3);

const itemSchema = Joi.object({
  productId: uuid().required(),
  quantity: qty.required(),
  unitPrice: money,
});

exports.createSchema = Joi.object({
  customerName: Joi.string().trim().min(2).max(128).required(),
  customerPhone: Joi.string().trim().min(7).max(32).required(),
  deliveryDate: Joi.date().iso().required(),
  notes: Joi.string().trim().max(1000).allow("", null),
  items: Joi.array().items(itemSchema).min(1).required(),
});

exports.publicCreateSchema = exports.createSchema;

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  search: Joi.string().trim().max(128).allow(""),
  status: Joi.string().valid("PENDING", "ON_LOADING", "DELIVERED", "CANCELLED"),
  paymentStatus: Joi.string().valid("UNPAID", "PARTIAL", "PAID"),
  productId: uuid(),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});

exports.idParamSchema = Joi.object({ id: uuid().required() });

exports.updateSchema = Joi.object({
  customerName: Joi.string().trim().min(2).max(128),
  customerPhone: Joi.string().trim().min(7).max(32),
  deliveryDate: Joi.date().iso(),
  notes: Joi.string().trim().max(1000).allow("", null),
  items: Joi.array().items(itemSchema).min(1),
}).min(1);

exports.approveSchema = Joi.object({
  warehouseId: uuid().required(),
  paymentMethodId: uuid().required(),
  paidAmount: money.required(),
  status: Joi.string().valid("ON_LOADING", "DELIVERED"),
  items: Joi.array().items(itemSchema).min(1),
});

exports.statusSchema = Joi.object({
  status: Joi.string().valid("ON_LOADING", "DELIVERED").required(),
});

exports.paymentSchema = Joi.object({
  amount: Joi.number().min(0.01).precision(2).required(),
  paymentMethodId: uuid(),
});
