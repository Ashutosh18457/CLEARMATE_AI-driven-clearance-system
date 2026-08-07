/**
 * Custom operational error class.
 * Carries HTTP status code and error classification to enable
 * the centralized error handler to send appropriate responses.
 *
 * isOperational flag distinguishes expected errors (bad input, not found)
 * from unexpected programming bugs — only operational errors are safe
 * to expose to the client.
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errorCode = 'BAD_REQUEST') {
    return new AppError(message, 400, errorCode);
  }

  static unauthorized(message = 'Authentication required', errorCode = 'UNAUTHORIZED') {
    return new AppError(message, 401, errorCode);
  }

  static forbidden(message = 'Insufficient permissions', errorCode = 'FORBIDDEN') {
    return new AppError(message, 403, errorCode);
  }

  static notFound(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    return new AppError(message, 404, errorCode);
  }

  static conflict(message, errorCode = 'CONFLICT') {
    return new AppError(message, 409, errorCode);
  }

  static validationError(message, errorCode = 'VALIDATION_ERROR') {
    return new AppError(message, 422, errorCode);
  }

  static tooManyRequests(message = 'Too many requests, please try again later', errorCode = 'RATE_LIMIT') {
    return new AppError(message, 429, errorCode);
  }
}

module.exports = AppError;
