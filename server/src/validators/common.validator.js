const Joi = require('joi');
const mongoose = require('mongoose');

// Custom ObjectId validator ensuring strict 24-character hexadecimal MongoDB ObjectIds
const objectId = Joi.string().custom((value, helpers) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value.toString();
}, 'ObjectId validation').messages({
  'any.invalid': 'Invalid ID format. Must be a valid 24-character hexadecimal ObjectId',
});

const commonValidator = {
  objectId,

  // Standard route params
  idParamSchema: Joi.object({
    id: objectId.required().messages({
      'any.required': 'ID parameter is required',
    }),
  }),

  studentIdParamSchema: Joi.object({
    studentId: objectId.required().messages({
      'any.required': 'Student ID parameter is required',
    }),
  }),

  tokenParamSchema: Joi.object({
    token: Joi.string().trim().min(1).max(256).required().messages({
      'any.required': 'Token parameter is required',
    }),
  }),

  certificateNumberParamSchema: Joi.object({
    certificateNumber: Joi.string().trim().min(3).max(100).required().messages({
      'any.required': 'Certificate number is required',
    }),
  }),

  branchCodeParamSchema: Joi.object({
    branchCode: Joi.string().trim().min(1).max(20).uppercase().required().messages({
      'any.required': 'Branch code is required',
    }),
  }),

  // Standard pagination & search query parameters
  paginationQuerySchema: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(50),
    search: Joi.string().trim().max(100).allow(''),
    q: Joi.string().trim().max(100).allow(''),
  }),
};

module.exports = commonValidator;
