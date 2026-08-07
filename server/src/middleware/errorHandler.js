const AppError = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * Centralized error-handling middleware.
 * ALL errors pass through here — the single source of truth for error responses.
 *
 * Design decisions:
 * - Operational errors (AppError, Mongoose validation) → appropriate status + safe message.
 * - Programming bugs → generic 500 to client, full stack trace to logs.
 * - Mongoose-specific errors mapped to user-friendly responses.
 */
const errorHandler = (err, req, res, _next) => {
  // Log full error details server-side
  logger.error(err.message, {
    errorCode: err.errorCode,
    statusCode: err.statusCode,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: err.stack,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      error: { code: 'VALIDATION_ERROR', details },
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
      error: { code: 'DUPLICATE_KEY' },
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource identifier',
      error: { code: 'INVALID_ID' },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
      error: { code: 'INVALID_TOKEN' },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token has expired',
      error: { code: 'TOKEN_EXPIRED' },
    });
  }

  // Our operational AppError
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: { code: err.errorCode },
    });
  }

  // Unknown / programming errors — generic message to client
  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: { code: 'INTERNAL_ERROR' },
  });
};

module.exports = errorHandler;
