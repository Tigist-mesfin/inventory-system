const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });
const money = Joi.number().min(0).precision(2);
const qty = Joi.number().min(0.001).precision(3);

const itemSchema = Joi.object({
  productId: uuid().required(),
  quantity: qty.required(),
  unitPrice: money.required(),
});

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  search: Joi.string().trim().max(128).allow(""),
  status: Joi.string().valid(
    "DRAFT",
    "SUBMITTED",
    "APPROVED",
    "PARTIALLY_RECEIVED",
    "COMPLETED",
    "CANCELLED",
  ),
  supplierId: uuid(),
  productId: uuid(),
  paymentMethod: Joi.string().trim().max(64).allow(""),
  createdBy: uuid(),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});

exports.idParamSchema = Joi.object({ id: uuid().required() });
exports.itemIdParamSchema = Joi.object({ itemId: uuid().required() });

exports.deliverAllSchema = Joi.object({
  warehouseId: uuid().required(),
});

exports.updateItemSchema = Joi.object({
  deliveryStatus: Joi.string().valid("NOT_DELIVERED", "ON_LOADING", "DELIVERED"),
  warehouseId: uuid().allow(null),
  quantity: qty,
}).min(1);

exports.createSchema = Joi.object({
  supplierId: uuid().allow(null),
  walkInName: Joi.string().trim().max(128).allow("", null),
  orderDate: Joi.date().iso(),
  expectedDate: Joi.date().iso().allow(null),
  dueDate: Joi.date().iso().allow(null),
  taxAmount: money,
  discountAmount: money,
  notes: Joi.string().trim().max(4000).allow("", null),
  paymentMethod: Joi.string().trim().max(64).required(),
  paidAmount: money,
  items: Joi.array().items(itemSchema).min(1).required(),
}).or("supplierId", "walkInName");

exports.paySchema = Joi.object({
  amount: Joi.number().min(0.01).precision(2).required(),
  paymentMethod: Joi.string().trim().max(64).required(),
});

exports.updateSchema = Joi.object({
  supplierId: uuid(),
  orderDate: Joi.date().iso(),
  expectedDate: Joi.date().iso().allow(null),
  dueDate: Joi.date().iso().allow(null),
  taxAmount: money,
  discountAmount: money,
  notes: Joi.string().trim().max(4000).allow("", null),
  items: Joi.array().items(itemSchema).min(1),
}).min(1);
