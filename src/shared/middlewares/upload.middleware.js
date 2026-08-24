const AppError = require("../errors/AppError");

// Wraps any multer middleware (uploader.single(field), .array(field, max),
// .fields([...]), etc.) so its errors — bad mimetype, oversized file —
// surface as a clean 400 instead of an unhandled 500.
module.exports = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) return next(AppError.badRequest(err.message, "UPLOAD_ERROR"));
    next();
  });
};
