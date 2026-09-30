const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });
const money = Joi.number().min(0).precision(2);
const qty = Joi.number().min(0).precision(3);

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(500),
  search: Joi.string().trim().max(128).allow(""),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
  type: Joi.string().valid("CUSTOMER", "SUPPLIER"),
  followUpDays: Joi.number().integer().min(1).max(365),
});

exports.idParamSchema = Joi.object({
  id: uuid().required(),
});

exports.createSchema = Joi.object({
  name: Joi.string().trim().min(1).max(128).required(),
  phone: Joi.string().trim().min(7).max(32).required(),
  location: Joi.string().trim().max(256).allow("", null),
  type: Joi.string().valid("CUSTOMER", "SUPPLIER").required(),
  businessName: Joi.string().trim().max(128).allow("", null),
  creditLimit: money,
  notes: Joi.string().trim().max(4000).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
});

exports.updateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(128),
  phone: Joi.string().trim().min(7).max(32),
  location: Joi.string().trim().max(256).allow("", null),
  type: Joi.string().valid("CUSTOMER", "SUPPLIER"),
  businessName: Joi.string().trim().max(128).allow("", null),
  creditLimit: money,
  notes: Joi.string().trim().max(4000).allow("", null),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
}).min(1);

exports.priceSchema = Joi.object({
  productId: uuid().required(),
  unitPrice: money.required(),
  minQuantity: qty,
});

exports.pricesSchema = Joi.object({
  prices: Joi.array().items(exports.priceSchema).min(1).required(),
});

exports.paymentSchema = Joi.object({
  saleId: uuid().allow(null),
  amount: Joi.number().min(0.01).precision(2).required(),
  method: Joi.string().trim().max(64).required(),
  paidAt: Joi.date().iso(),
  notes: Joi.string().trim().max(2000).allow("", null),
});

exports.walletRechargeSchema = Joi.object({
  amount: Joi.number().min(0.01).precision(2).required(),
  method: Joi.string().trim().max(64).required(),
  reason: Joi.string().trim().max(500).allow("", null),
  paidAt: Joi.date().iso(),
});

exports.walletListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(200),
  search: Joi.string().trim().max(128).allow(""),
  customerId: uuid(),
  type: Joi.string().valid("DEPOSIT", "SALE", "REFUND"),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});
