const Joi = require('joi');
const { objectId } = require('./common.validator');

const clearanceValidator = {
  // Student initiates clearance
  initiateClearanceSchema: Joi.object({
    semesterId: objectId.optional().allow('', null)
      .messages({ 'any.invalid': 'Invalid Semester ID format' }),
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

  // Admin / Exam Cell Hall Ticket Issuance
  issueHallTicketSchema: Joi.object({
    clearanceRequestId: objectId.required().messages({
      'any.required': 'Clearance Request ID is required',
      'any.invalid': 'Invalid Clearance Request ID format',
    }),
    hallTicketNumber: Joi.string().trim().min(1).max(100).optional().allow('', null),
    remarks: Joi.string().trim().max(500).optional().allow(''),
  }),

  searchStudentClearanceQuerySchema: Joi.object({
    q: Joi.string().trim().min(1).max(100).required().messages({
      'any.required': 'Search query parameter (q) is required',
    }),
  }),

  classListClearanceQuerySchema: Joi.object({
    semesterNumber: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string().max(10)).optional(),
    programId: objectId.optional().allow('', null),
    section: Joi.string().trim().max(10).optional().allow('', null),
  }),

  hallTicketSearchQuerySchema: Joi.object({
    q: Joi.string().trim().min(1).max(100).required().messages({
      'any.required': 'Search query parameter (q) is required',
    }),
  }),

  hallTicketRosterQuerySchema: Joi.object({
    semesterId: objectId.optional().allow('', null),
    programId: objectId.optional().allow('', null),
    status: Joi.string().valid('all', 'issued', 'eligible', 'pending', 'blocked', 'approved', 'completed').optional(),
    search: Joi.string().trim().max(100).optional().allow(''),
  }),
};

module.exports = clearanceValidator;
