const AppError = require("../errors/AppError");

module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    const error = { code: err.errorCode, message: err.message };
    if (err.details !== undefined) error.details = err.details;
    return res.status(err.statusCode).json({ success: false, error });
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    const field = err.errors?.[0]?.path || "value";
    return res.status(409).json({
      success: false,
      error: { code: "CONFLICT", message: `${field} is already in use` },
    });
  }

  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(409).json({
      success: false,
      error: {
        code: "CONFLICT",
        message:
          "Record is referenced by other data and cannot be deleted or updated",
      },
    });
  }

  if (err.name === "SequelizeValidationError") {
    const msg = err.errors?.map((e) => e.message).join("; ") || "Validation failed";
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: msg },
    });
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: err.message || "Something went wrong",
    },
  });
};
