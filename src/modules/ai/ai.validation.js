const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });

const PERIODS = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
  "custom",
];

exports.filtersQuerySchema = Joi.object({
  period: Joi.string().valid(...PERIODS),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  warehouseId: uuid(),
  salesmanId: uuid(),
  productId: uuid(),
  search: Joi.string().trim().max(64).allow(""),
  limit: Joi.number().integer().min(1).max(50),
  deadDays: Joi.number().integer().min(7).max(365),
});

exports.chatSchema = Joi.object({
  question: Joi.string().trim().min(2).max(500).required(),
  filters: Joi.object({
    period: Joi.string().valid(...PERIODS),
    from: Joi.date().iso(),
    to: Joi.date().iso(),
    warehouseId: uuid(),
    salesmanId: uuid(),
    productId: uuid(),
    search: Joi.string().trim().max(64).allow(""),
  }).unknown(false),
});
