const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  supplierId: uuid(),
});

exports.createSchema = Joi.object({
  supplierId: uuid().required(),
  purchaseOrderId: uuid().allow(null),
  amount: Joi.number().min(0.01).precision(2).required(),
  method: Joi.string().trim().max(64).required(),
  paidAt: Joi.date().iso(),
  dueDate: Joi.date().iso().allow(null),
  notes: Joi.string().trim().max(2000).allow("", null),
});
