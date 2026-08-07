const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation');

const clearanceValidator = {
  // Student initiates clearance
  initiateClearanceSchema: Joi.object({
    semesterId: objectId.required()
      .messages({ 'any.required': 'Semester ID is required', 'any.invalid': 'Invalid Semester ID' }),
  }),

  // Teacher reviews an item clearance
  reviewItemSchema: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required()
      .messages({ 'any.required': 'Status is required (approved or rejected)' }),
    remarks: Joi.string().trim().max(500).optional().allow(''),
  }),

  // Section Head reviews a section clearance
  reviewSectionSchema: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required()
      .messages({ 'any.required': 'Status is required (approved or rejected)' }),
    remarks: Joi.string().trim().max(500).optional().allow(''),
  }),

  // Class Incharge reviews
  reviewCISchema: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required()
      .messages({ 'any.required': 'Status is required (approved or rejected)' }),
    remarks: Joi.string().trim().max(500).optional().allow(''),
  }),

  // HOD final review
  reviewHODSchema: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required()
      .messages({ 'any.required': 'Status is required (approved or rejected)' }),
    remarks: Joi.string().trim().max(500).optional().allow(''),
  }),
};

module.exports = clearanceValidator;
