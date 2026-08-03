import AppError from '../utils/AppError.js';

/**
 * validate — Joi schema validation middleware factory.
 * @param {Object} schema - Joi schema with optional body, params, query keys.
 */
const validate = (schema) => {
  return (req, res, next) => {
    const sources = { body: req.body, params: req.params, query: req.query };
    for (const [key, joiSchema] of Object.entries(schema)) {
      if (!sources[key]) continue;
      const { error, value } = joiSchema.validate(sources[key], {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        const message = error.details.map((d) => d.message).join(', ');
        return next(AppError.badRequest(message, 'VALIDATION_ERROR'));
      }
      req[key] = value;
    }
    next();
  };
};

export default validate;
