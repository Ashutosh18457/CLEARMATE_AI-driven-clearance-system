const Joi = require('joi');
const { objectId } = require('./common.validator');

const authValidator = {
  loginSchema: Joi.object({
    email: Joi.string()
      .trim()
      .min(1)
      .max(255)
      .required()
      .messages({
        'string.empty': 'Email or Enrollment Number cannot be empty',
        'string.max': 'Email or Enrollment Number cannot exceed 255 characters',
        'any.required': 'Email or Enrollment Number is required',
      }),
    password: Joi.string()
      .min(1)
      .max(128)
      .required()
      .messages({
        'string.max': 'Password cannot exceed 128 characters',
        'any.required': 'Password is required',
      }),
  }),

  forgotPasswordSchema: Joi.object({
    email: Joi.string()
      .email()
      .trim()
      .max(255)
      .required()
      .pattern(/^[a-zA-Z0-9._%+-]+@sbjit\.edu\.in$/i)
      .messages({
        'string.email': 'Please provide a valid email format',
        'string.pattern.base': 'Only official college domain (@sbjit.edu.in) is allowed for password reset',
        'any.required': 'Email is required',
      }),
  }),

  resetPasswordSchema: Joi.object({
    token: Joi.string().trim().max(512).optional().messages({
      'string.base': 'Reset token must be a string',
    }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
        'any.required': 'New password is required',
      }),
  }),

  changePasswordSchema: Joi.object({
    currentPassword: Joi.string().min(1).max(128).required().messages({
      'any.required': 'Current password is required',
    }),
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
        'any.required': 'New password is required',
      }),
  }),

  registerSchema: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      'string.min': 'Full name must not be empty',
      'string.max': 'Full name cannot exceed 100 characters',
      'any.required': 'Full Name is required',
    }),
    email: Joi.string()
      .email()
      .trim()
      .max(255)
      .required()
      .pattern(/^[a-zA-Z0-9._%+-]+@sbjit\.edu\.in$/i)
      .messages({
        'string.email': 'Please provide a valid email format',
        'string.pattern.base': 'Registration is restricted to official college emails (@sbjit.edu.in)',
        'any.required': 'Email is required',
      }),
    password: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'any.required': 'Password is required',
    }),
    role: Joi.string()
      .valid('student', 'teacher', 'section_head', 'account_section', 'bus_section', 'library_section', 'disciplinary_section', 'class_incharge', 'hod', 'admin')
      .default('student'),
    enrollmentNo: Joi.string().trim().max(50).optional().allow(''),
    programId: objectId.optional().allow('', null),
    currentSemester: Joi.number().integer().min(1).max(12).optional(),
    section: Joi.string().trim().max(10).optional().allow(''),
    sectionType: Joi.string().valid('library', 'accounts', 'bus', 'student_section', 'disciplinary').optional(),
  }),
};

module.exports = authValidator;
