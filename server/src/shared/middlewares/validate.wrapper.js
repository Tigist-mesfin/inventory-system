const validate = require('./validate.middleware');
const { deleteReqFiles } = require('../upload/fileCleanup.helper');

exports.validateBody = (schema) => validate({ body: schema });
exports.validateQuery = (schema) => validate({ query: schema });
exports.validateParams = (schema) => validate({ params: schema });

// For routes where an upload middleware runs before validation: if the body
// fails validation, any file already written to disk is rolled back before
// the error is forwarded, so failed requests never leave orphaned uploads.
exports.validateBodyAfterUpload = (schema) => {
  const middleware = validate({ body: schema });
  return (req, res, next) => {
    try {
      middleware(req, res, next);
    } catch (err) {
      deleteReqFiles(req);
      next(err);
    }
  };
};
