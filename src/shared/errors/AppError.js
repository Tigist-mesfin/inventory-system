class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }

  static badRequest(msg, code = "BAD_REQUEST") {
    return new AppError(msg, 400, code);
  }

  static unauthorized(msg = "Unauthorized", code = "UNAUTHORIZED") {
    return new AppError(msg, 401, code);
  }

  static forbidden(msg = "Forbidden", code = "FORBIDDEN") {
    return new AppError(msg, 403, code);
  }

  static notFound(msg = "Not found", code = "NOT_FOUND") {
    return new AppError(msg, 404, code);
  }

  static conflict(msg, code = "CONFLICT") {
    return new AppError(msg, 409, code);
  }

  static tooMany(msg = "Too many requests", code = "TOO_MANY_REQUESTS") {
    return new AppError(msg, 429, code);
  }
}

module.exports = AppError;
