const AppError = require('../utils/AppError');

/**
 * Strict Request Validation Middleware
 * Validates request payloads (body, params, query) against strict Joi schemas.
 *
 * Rejection Policy:
 * - Reject any payload containing extra/unknown fields (allowUnknown: false)
 * - Reject any payload violating exact type, length, or format constraints
 * - Collect all errors (abortEarly: false)
 * - Assign validated, cast values back to req[source]
 *
 * Usage:
 * 1. Single source (default 'body'):
 *    router.post('/route', validate(myJoiSchema), controller);
 *    router.get('/route/:id', validate(idParamSchema, 'params'), controller);
 *
 * 2. Multi-source object:
 *    router.get('/route/:id', validate({ params: idParamSchema, query: filterQuerySchema }), controller);
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  if (!schema) return next();

  // Multi-source object check: e.g. { body: JoiSchema, params: JoiSchema, query: JoiSchema }
  const isMultiSource =
    typeof schema === 'object' &&
    !schema.isJoi &&
    (schema.body || schema.params || schema.query);

  const validationOptions = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: false,
  };

  if (isMultiSource) {
    const errorMessages = [];

    ['params', 'query', 'body'].forEach((src) => {
      if (schema[src] && schema[src].isJoi) {
        const { error, value } = schema[src].validate(req[src] || {}, validationOptions);
        if (error) {
          error.details.forEach((detail) => {
            errorMessages.push(`[${src}] ${detail.message}`);
          });
        } else {
          req[src] = value;
        }
      }
    });

    if (errorMessages.length > 0) {
      return next(AppError.validationError(errorMessages.join('; ')));
    }

    return next();
  }

  // Single source validation (schema is a Joi object)
  const targetData = req[source] || {};
  const { error, value } = schema.validate(targetData, validationOptions);

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(AppError.validationError(errorMessage));
  }

  req[source] = value;
  next();
};

module.exports = validate;
