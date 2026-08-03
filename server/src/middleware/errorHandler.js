import logger from '../config/logger.js';

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
    code = 'VALIDATION_ERROR';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue).join(', ');
    message = `Duplicate value for: ${field}`;
    code = 'DUPLICATE_KEY';
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    code = 'CAST_ERROR';
  }

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, { stack: err.stack, url: req.originalUrl, method: req.method });
  } else {
    logger.warn(`${statusCode} - ${message}`, { url: req.originalUrl, method: req.method });
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: { code },
  });
};

export default errorHandler;
