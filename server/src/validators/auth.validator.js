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
    email: Joi.string()
      .email()
      .trim()
      .required()
      .pattern(/^[a-zA-Z0-9._%+-]+@sbjit\.edu\.in$/i)
      .messages({
        'string.email': 'Please provide a valid email format',
        'string.pattern.base': 'Only official college domain (@sbjit.edu.in) is allowed',
        'any.required': 'Email is required',
      }),
  }),
  resetPasswordSchema: Joi.object({
    token: Joi.string().optional().messages({
      'string.base': 'Reset token must be a string',
    }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
        'any.required': 'New password is required',
      }),
  }),

  registerSchema: Joi.object({
    name: Joi.string().trim().max(100).required().messages({
      'any.required': 'Full Name is required',
    }),
    email: Joi.string()
      .email()
      .required()
      .pattern(/^[a-zA-Z0-9._%+-]+@sbjit\.edu\.in$/i)
      .messages({
        'string.email': 'Please provide a valid email format',
        'string.pattern.base': 'Registration is restricted to official college emails (@sbjit.edu.in)',
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
