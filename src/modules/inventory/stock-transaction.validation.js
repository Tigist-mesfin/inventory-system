const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });

exports.listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
  productId: uuid(),
  warehouseId: uuid(),
  type: Joi.string().valid(
    "PURCHASE",
    "SALE",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "ADJUSTMENT_IN",
    "ADJUSTMENT_OUT",
  ),
  referenceType: Joi.string().trim().max(64),
  referenceId: uuid(),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});
