const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
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

  // Teacher verifies or rejects a student submission
  verifySubmissionSchema: Joi.object({
    status: Joi.string().valid('verified', 'rejected').required()
      .messages({ 'any.required': 'Status is required (verified or rejected)' }),
    remarks: Joi.string().trim().max(500).optional(),
  }),

  // Student marks their work as submitted
  submitWorkSchema: Joi.object({
    submissionItemId: objectId.required()
      .messages({ 'any.required': 'Submission Item ID is required', 'any.invalid': 'Invalid Submission Item ID' }),
  }),
};

module.exports = submissionValidator;
