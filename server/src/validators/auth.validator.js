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
  }),

  registerSchema: Joi.object({
    name: Joi.string().trim().max(100).required().messages({
      'any.required': 'Full Name is required',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email format',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    role: Joi.string().valid('student', 'teacher', 'section_head', 'class_incharge', 'hod', 'admin').default('student'),
    enrollmentNo: Joi.string().trim().optional().allow(''),
    programId: Joi.string().optional().allow(''),
    currentSemester: Joi.number().optional(),
    section: Joi.string().optional().allow(''),
    sectionType: Joi.string().valid('library', 'accounts', 'bus', 'student_section').optional(),
  }),
};

module.exports = authValidator;
