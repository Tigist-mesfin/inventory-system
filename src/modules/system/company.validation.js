const Joi = require("joi");

exports.updateSchema = Joi.object({
  name: Joi.string().trim().max(128).allow("", null),
  address: Joi.string().trim().max(255).allow("", null),
  phone: Joi.string().trim().max(64).allow("", null),
  email: Joi.string().trim().max(128).allow("", null),
  tin: Joi.string().trim().max(64).allow("", null),
}).min(1);
