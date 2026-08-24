const Joi = require('joi');
const AppError = require('../errors/AppError');
module.exports = (schemas, options = {}) => (req, res, next) => {
  const opts = { abortEarly: false, stripUnknown: true, ...options };
  for (const [part, schema] of Object.entries(schemas)) {
    if (!schema) continue;
    const { error, value } = schema.validate(req[part], opts);
    if (error) {
      const msg = error.details.map(d => d.message).join('; ');
      throw AppError.badRequest(msg, 'VALIDATION_ERROR');
    }
    if (part === 'query') {
      // Express 5's req.query is a getter that re-parses the raw URL on
      // every access rather than a plain writable property, so a normal
      // `req.query = value` assignment is silently discarded. Redefining
      // the property is the only way to make the validated/coerced value
      // (e.g. Joi.number() turning "9.03" into 9.03) actually stick.
      Object.defineProperty(req, 'query', {
        value,
        configurable: true,
        enumerable: true,
        writable: true,
      });
    } else {
      req[part] = value;
    }
  }
  next();
};
