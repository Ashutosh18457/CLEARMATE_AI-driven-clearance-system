const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.custom((value, helpers) => {
  if (value && typeof value === 'object' && value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
    return value;
  }
  return helpers.error('any.invalid');
}, 'ObjectId validation');

const submissionValidator = {
  // Teacher creates a submission item (assignment, lab record, etc.)
  createSubmissionItemSchema: Joi.object({
    clearanceItemId: objectId.required()
      .messages({ 'any.required': 'Clearance Item ID is required', 'any.invalid': 'Invalid Clearance Item ID' }),
    title: Joi.string().trim().max(200).required()
      .messages({ 'any.required': 'Submission title is required' }),
    type: Joi.string().valid('assignment', 'lab_record', 'project', 'presentation', 'other').required()
      .messages({ 'any.required': 'Submission type is required' }),
    description: Joi.string().trim().max(1000).optional(),
    deadline: Joi.date().iso().required()
      .messages({ 'any.required': 'Deadline is required' }),
    isRequired: Joi.boolean().default(true),
  }),

  // Teacher updates a submission item
  updateSubmissionItemSchema: Joi.object({
    clearanceItemId: objectId.optional()
      .messages({ 'any.invalid': 'Invalid Clearance Item ID' }),
    title: Joi.string().trim().max(200).optional(),
    type: Joi.string().valid('assignment', 'lab_record', 'project', 'presentation', 'other').optional(),
    description: Joi.string().trim().max(1000).allow('').optional(),
    deadline: Joi.date().iso().optional(),
    isRequired: Joi.boolean().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update',
  }),

  // Teacher verifies or rejects a student submission
  verifySubmissionSchema: Joi.object({
    status: Joi.string().valid('verified', 'rejected').required()
      .messages({ 'any.required': 'Status is required (verified or rejected)' }),
    remarks: Joi.string().trim().max(500).optional(),
  }),

  // Teacher bulk verifies or rejects multiple student submissions
  bulkVerifySubmissionSchema: Joi.object({
    submissionIds: Joi.array()
      .items(objectId)
      .min(1)
      .max(50)
      .required()
      .messages({
        'any.required': 'submissionIds array is required',
        'array.min': 'Select at least one submission to review',
        'array.max': 'Cannot process more than 50 submissions at once',
      }),
    status: Joi.string().valid('verified', 'rejected').required()
      .messages({ 'any.required': 'Status is required (verified or rejected)' }),
    remarks: Joi.string()
      .trim()
      .max(500)
      .when('status', {
        is: 'rejected',
        then: Joi.required().messages({
          'any.required': 'Remarks are required when rejecting submissions in bulk to explain the reason to students',
          'string.empty': 'Remarks cannot be empty when rejecting submissions',
        }),
        otherwise: Joi.optional().allow(''),
      }),
  }),

  // Student marks their work as submitted
  submitWorkSchema: Joi.object({
    submissionItemId: objectId.required()
      .messages({ 'any.required': 'Submission Item ID is required', 'any.invalid': 'Invalid Submission Item ID' }),
  }),
};

module.exports = submissionValidator;
