const Joi = require("joi");

const PERIODS = ["today", "this_week", "this_month", "custom", "all"];

exports.filtersQuerySchema = Joi.object({
  period: Joi.string().valid(...PERIODS),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
  search: Joi.string().trim().max(64).allow(""),
  limit: Joi.number().integer().min(1).max(100),
  page: Joi.number().integer().min(1).max(10000),
});

const smsMessageFields = {
  title: Joi.string().trim().max(80).allow(""),
  body: Joi.string().trim().max(320).allow(""),
};

exports.singleSmsSchema = Joi.object({
  ...smsMessageFields,
})
  .or("title", "body")
  .messages({
    "object.missing": "Provide a title and/or body",
  });

exports.bulkSmsSchema = Joi.object({
  ...smsMessageFields,
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
})
  .or("title", "body")
  .messages({
    "object.missing": "Provide a title and/or body",
  });

exports.smsJobParamsSchema = Joi.object({
  jobId: Joi.string().uuid().required(),
});

exports.companyIdParamsSchema = Joi.object({
  companyId: Joi.string().uuid().required(),
});
