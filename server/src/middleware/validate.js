const AppError = require('../utils/AppError');

/**
 * Higher-order middleware function to validate request payload against a Joi schema.
 * Throws a formatted validation error if it fails, which is caught by the central errorHandler.
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error } = schema.validate(req[source], { abortEarly: false });

  if (error) {
    // Map Joi errors into a clean array of strings
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(AppError.validationError(errorMessage));
  }

  next();
};

module.exports = validate;
