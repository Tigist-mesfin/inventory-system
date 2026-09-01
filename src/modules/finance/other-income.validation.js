const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });

const PERIODS = [
  "today",
  "this_week",
  "this_month",
  "last_month",
  "this_year",
  "custom",
];

exports.PERIODS = PERIODS;

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(200),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  paymentMethod: Joi.string().trim().max(64).allow(""),
  search: Joi.string().trim().max(128).allow(""),
});

exports.reportQuerySchema = Joi.object({
  period: Joi.string().valid(...PERIODS),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  paymentMethod: Joi.string().trim().max(64).allow(""),
});

exports.idParamSchema = Joi.object({
  id: uuid().required(),
});

exports.createSchema = Joi.object({
  incomeDate: Joi.date().iso().required(),
  receivedFrom: Joi.string().trim().min(1).max(128).required(),
  reason: Joi.string().trim().min(1).max(256).required(),
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().trim().max(64).allow("", null),
  notes: Joi.string().trim().max(1000).allow("", null),
});

exports.updateSchema = Joi.object({
  incomeDate: Joi.date().iso(),
  receivedFrom: Joi.string().trim().min(1).max(128),
  reason: Joi.string().trim().min(1).max(256),
  amount: Joi.number().positive(),
  paymentMethod: Joi.string().trim().max(64).allow("", null),
  notes: Joi.string().trim().max(1000).allow("", null),
}).min(1);
