const AppError = require('../utils/AppError');
const logger = require('../config/logger');

/**
 * Sanitizes error messages to ensure internal file paths, stack traces,
 * module references, and database internals are NEVER leaked to the client.
 *
 * @param {string} message - The raw message to sanitize
 * @returns {string} Safe user-facing message
 */
const sanitizeClientMessage = (message) => {
  if (!message || typeof message !== 'string') return 'An unexpected error occurred';

  // Check for internal file paths (Windows/UNIX), node_modules, or script extensions
  const hasFilePath = /[a-zA-Z]:\\[^\n\r]+|\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+|\.(js|jsx|ts|tsx|json|env|lock)\b|node_modules/i.test(message);

  // Check for raw database internals, socket addresses, or driver connection strings
  const hasDbInternals = /topology|replica|wireversion|socket|connection pool|buffering timed out|ECONNREFUSED|getaddrinfo|BSON|mongodb:\/\/|mongodb\+srv:\/\//i.test(message);

  // Check for stack trace line signatures (e.g., "at Function.xyz", "at async", "at Object.<anonymous>")
  const hasStackSignature = /^\s*at\s+([a-zA-Z0-9._$<>]+|\/|[a-zA-Z]:)/m.test(message);

  if (hasFilePath || hasDbInternals || hasStackSignature) {
    return 'An unexpected system error occurred. Please try again or contact support.';
  }

  return message;
};

/**
 * Centralized error-handling middleware.
 * ALL errors pass through here — single source of truth for error responses.
 *
 * Security & Reliability Guarantees:
 * - Full error details (stack, path, method, IP, query) logged SERVER-SIDE only.
 * - Zero stack traces, file paths, or internal database metadata sent to client.
 * - Mongoose, Mongo, JWT, Multer, and BodyParser errors safely mapped to generic user-friendly responses.
 */
const errorHandler = (err, req, res, _next) => {
  // 1. Comprehensive Server-Side Logging for Debugging
  logger.error(err.message || 'Unhandled Server Error', {
    errorCode: err.errorCode || 'INTERNAL_ERROR',
    statusCode: err.statusCode || 500,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: err.stack,
    name: err.name,
    code: err.code,
  });

  // Ensure security header on all error responses
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 2. Mongoose Schema Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors)
      .map((e) => sanitizeClientMessage(e.message))
      .filter(Boolean);

    return res.status(422).json({
      success: false,
      message: 'Validation failed for one or more fields',
      error: {
        code: 'VALIDATION_ERROR',
        details: details.length > 0 ? details : ['Invalid field values submitted'],
      },
    });
  }

  // 3. Mongoose Duplicate Key Error (code 11000 / 11001)
  if (err.code === 11000 || err.code === 11001) {
    let field = 'record';
    if (err.keyValue && typeof err.keyValue === 'object') {
      const keys = Object.keys(err.keyValue);
      if (keys.length > 0) field = keys[0];
    } else if (err.keyPattern && typeof err.keyPattern === 'object') {
      const keys = Object.keys(err.keyPattern);
      if (keys.length > 0) field = keys[0];
    }

    const cleanField = field
      .replace(/([A-Z])/g, ' $1')
      .replace(/[._-]/g, ' ')
      .toLowerCase()
      .trim();

    return res.status(409).json({
      success: false,
      message: `A record with this ${cleanField || 'identifier'} already exists`,
      error: { code: 'DUPLICATE_KEY' },
    });
  }

  // 4. Mongoose CastError / Invalid ObjectId / BSON errors
  if (
    err.name === 'CastError' ||
    err.name === 'BSONError' ||
    err.name === 'BSONTypeError' ||
    (typeof err.message === 'string' && err.message.includes('Cast to ObjectId failed'))
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource identifier format',
      error: { code: 'INVALID_ID' },
    });
  }

  // 5. Database Connection / Server Selection Errors
  if (
    err.name === 'MongoServerError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoTimeoutError' ||
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoTopologyClosedError'
  ) {
    return res.status(503).json({
      success: false,
      message: 'Database service is temporarily unavailable. Please try again later.',
      error: { code: 'SERVICE_UNAVAILABLE' },
    });
  }

  // 6. JSON Parse / Syntax Error in Request Body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body',
      error: { code: 'INVALID_JSON' },
    });
  }

  // 7. Multer File Upload Errors
  if (err.name === 'MulterError') {
    let message = 'File upload failed';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Uploaded file exceeds the maximum allowed size limit';
    else if (err.code === 'LIMIT_FILE_COUNT') message = 'Too many files uploaded in a single request';
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Unexpected file field submitted';

    return res.status(400).json({
      success: false,
      message,
      error: { code: 'FILE_UPLOAD_ERROR' },
    });
  }

  // 8. JWT Authentication & Token Expiry Errors
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

  if (err.name === 'NotBeforeError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is not yet active',
      error: { code: 'TOKEN_INACTIVE' },
    });
  }

  // 9. Trusted Operational AppError
  if (err instanceof AppError && err.isOperational) {
    const safeMessage = sanitizeClientMessage(err.message);
    return res.status(err.statusCode || 400).json({
      success: false,
      message: safeMessage,
      error: { code: err.errorCode || 'BAD_REQUEST' },
    });
  }

  // 10. Untrusted / Unexpected Programming Bugs (500 Internal Error)
  // NEVER leak internal error message or stack trace to client
  return res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred',
    error: { code: 'INTERNAL_ERROR' },
  });
};

module.exports = errorHandler;
