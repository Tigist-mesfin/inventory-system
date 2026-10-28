const Joi = require("joi");

exports.createKachaPaymentSchema = Joi.object({
  /** Optional partial amount for COMPLETED sales with remaining balance only. */
  amount: Joi.number().positive().precision(2),
  reason: Joi.string().trim().max(255).allow("", null),
}).default({});

exports.paymentIdParamSchema = Joi.object({
  id: Joi.string().uuid({ version: "uuidv4" }).required(),
  paymentId: Joi.string().uuid({ version: "uuidv4" }).required(),
});
