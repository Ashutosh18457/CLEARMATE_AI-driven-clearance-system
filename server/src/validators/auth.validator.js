const Joi = require('joi');

const authValidator = {
  loginSchema: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email format',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required',
      }),
  }).unknown(true),
  forgotPasswordSchema: Joi.object({
    email: Joi.string().email().trim().required().messages({
      'string.email': 'Please provide a valid email format',
      'any.required': 'Email is required',
    }),
  }),
  resetPasswordSchema: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'New password is required',
    }),
  }),
};

module.exports = authValidator;
