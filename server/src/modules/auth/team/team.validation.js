const Joi = require("joi");

const uuid = () => Joi.string().uuid({ version: "uuidv4" });

exports.createSalesmanSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(128).required(),
  phone: Joi.string().trim().min(7).max(32).required(),
  password: Joi.string().min(8).max(128).required(),
  allWarehouses: Joi.boolean().default(false),
  warehouseIds: Joi.array().items(uuid()).default([]),
  permissions: Joi.array().items(Joi.string().trim().max(64)).default([]),
});

exports.updateSalesmanSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(128),
  phone: Joi.string().trim().min(7).max(32),
  password: Joi.string().min(8).max(128),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
  allWarehouses: Joi.boolean(),
  warehouseIds: Joi.array().items(uuid()),
  permissions: Joi.array().items(Joi.string().trim().max(64)),
}).min(1);
