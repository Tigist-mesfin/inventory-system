const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });

exports.marketplaceQuerySchema = Joi.object({
  search: Joi.string().trim().max(128).allow(""),
  warehouseId: uuid(),
  brand: Joi.string().trim().max(64).allow(""),
  size: Joi.string().trim().max(32).allow(""),
  color: Joi.string().trim().max(32).allow(""),
});

exports.tradeReportQuerySchema = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  productId: uuid(),
  itemId: uuid(),
  customerId: uuid(),
  supplierId: uuid(),
  warehouseId: uuid(),
  storeId: uuid(),
  createdBy: uuid(),
  salespersonId: uuid(),
  paymentMethod: Joi.string().trim().max(64).allow(""),
  paymentStatus: Joi.string().valid("UNPAID", "PARTIAL", "PAID"),
  search: Joi.string().trim().max(128).allow(""),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(500),
  export: Joi.boolean(),
});
