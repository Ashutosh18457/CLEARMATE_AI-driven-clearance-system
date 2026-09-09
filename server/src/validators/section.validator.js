const Joi = require('joi');
const { objectId } = require('./common.validator');

const sectionValidator = {
  sectionLoginSchema: Joi.object({
    email: Joi.string().email().trim().max(255).required().messages({
      'string.email': 'Please provide a valid email format',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(1).max(128).required().messages({
      'any.required': 'Password is required',
    }),
  }),

  // ─── ACCOUNT SECTION ────────────────────────────────────────────────────────
  updateAccountFeesSchema: Joi.object({
    status: Joi.string().valid('paid', 'not_paid').required().messages({
      'any.required': 'Fee status (paid or not_paid) is required',
    }),
    reason: Joi.when('status', {
      is: 'not_paid',
      then: Joi.string().valid('fees_pending', 'remark').optional().allow('', null),
      otherwise: Joi.string().optional().allow('', null),
    }),
    remark_text: Joi.string().trim().max(500).optional().allow('', null),
  }),

  bulkUpdateAccountFeesSchema: Joi.object({
    studentIds: Joi.array().items(objectId).optional(),
    studentIdentifiers: Joi.array().items(Joi.string().trim().max(100)).optional(),
    status: Joi.string().valid('paid', 'not_paid', 'cleared').default('paid'),
    remark_text: Joi.string().trim().max(500).optional().allow('', null),
  }).or('studentIds', 'studentIdentifiers').messages({
    'object.missing': 'Either studentIds or studentIdentifiers must be provided',
  }),

  // ─── BUS SECTION ────────────────────────────────────────────────────────────
  updateBusFeesSchema: Joi.object({
    status: Joi.string().valid('paid', 'not_paid').optional(),
    fees_status: Joi.string().valid('paid', 'not_paid').optional(),
    reason: Joi.string().trim().max(200).optional().allow('', null),
    remark_text: Joi.string().trim().max(500).optional().allow('', null),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update bus fee status',
  }),

  bulkUpdateBusFeesSchema: Joi.object({
    studentIds: Joi.array().items(objectId).optional(),
    studentIdentifiers: Joi.array().items(Joi.string().trim().max(100)).optional(),
    status: Joi.string().valid('paid', 'not_paid').default('paid'),
    remark_text: Joi.string().trim().max(500).optional().allow('', null),
  }).or('studentIds', 'studentIdentifiers').messages({
    'object.missing': 'Either studentIds or studentIdentifiers must be provided',
  }),

  // ─── LIBRARY SECTION ────────────────────────────────────────────────────────
  updateLibraryStatusSchema: Joi.object({
    status: Joi.string().valid('paid', 'not_paid', 'cleared', 'pending').optional(),
    fees_status: Joi.string().valid('paid', 'not_paid', 'cleared', 'pending').optional(),
    library_status: Joi.string().valid('paid', 'not_paid', 'cleared', 'pending').optional(),
    reason: Joi.string().trim().max(200).optional().allow('', null),
    remark_text: Joi.string().trim().max(500).optional().allow('', null),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update library clearance status',
  }),

  bulkUpdateLibrarySchema: Joi.object({
    studentIds: Joi.array().items(objectId).optional(),
    studentIdentifiers: Joi.array().items(Joi.string().trim().max(100)).optional(),
    status: Joi.string().valid('paid', 'not_paid', 'cleared', 'pending').default('paid'),
    remark_text: Joi.string().trim().max(500).optional().allow('', null),
  }).or('studentIds', 'studentIdentifiers').messages({
    'object.missing': 'Either studentIds or studentIdentifiers must be provided',
  }),

  // ─── DISCIPLINARY SECTION ───────────────────────────────────────────────────
  updateDisciplinaryStatusSchema: Joi.object({
    disciplinary_status: Joi.string().valid('cleared', 'action_pending', 'pending', 'good_conduct', 'warning', 'suspended').optional(),
    status: Joi.string().valid('cleared', 'action_pending', 'pending', 'good_conduct', 'warning', 'suspended', 'paid', 'not_paid').optional(),
    fees_status: Joi.string().valid('paid', 'not_paid').optional(),
    reason: Joi.string().trim().max(200).optional().allow('', null),
    remark_text: Joi.string().trim().max(500).optional().allow('', null),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update disciplinary clearance status',
  }),

  bulkUpdateDisciplinarySchema: Joi.object({
    studentIds: Joi.array().items(objectId).optional(),
    studentIdentifiers: Joi.array().items(Joi.string().trim().max(100)).optional(),
    disciplinary_status: Joi.string().valid('cleared', 'action_pending', 'pending', 'good_conduct', 'warning', 'suspended').optional(),
    status: Joi.string().valid('cleared', 'action_pending', 'pending', 'good_conduct', 'warning', 'suspended', 'paid', 'not_paid').optional(),
    remark_text: Joi.string().trim().max(500).optional().allow('', null),
  }).or('studentIds', 'studentIdentifiers').messages({
    'object.missing': 'Either studentIds or studentIdentifiers must be provided',
  }),

  // ─── QUERY SCHEMA FOR SECTIONS ──────────────────────────────────────────────
  sectionStudentsQuerySchema: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(5000).default(1000),
    search: Joi.string().trim().max(100).allow(''),
    status: Joi.string().trim().max(50).allow(''),
    programId: Joi.string().trim().max(50).allow(''),
    program: Joi.string().trim().max(50).allow(''),
    branch: Joi.string().trim().max(50).allow(''),
    currentSemester: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string().max(10)).allow(''),
    sem: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string().max(10)).allow(''),
    semester: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string().max(10)).allow(''),
  }),
};

module.exports = sectionValidator;
