const Joi = require('joi');

const facultyMappingValidator = {
  createFacultyMappingSchema: Joi.object({
    branchCode: Joi.string().trim().uppercase().min(1).max(20).required().messages({
      'any.required': 'Branch code is required',
    }),
    branchName: Joi.string().trim().min(1).max(100).required().messages({
      'any.required': 'Branch name is required',
    }),
    department: Joi.string().trim().min(1).max(100).required().messages({
      'any.required': 'Department is required',
    }),
    hod: Joi.object({
      name: Joi.string().trim().max(100).required(),
      email: Joi.string().email().trim().max(255).required(),
      designation: Joi.string().trim().max(100).optional().allow('', null),
      department: Joi.string().trim().max(100).optional().allow('', null),
    }).optional(),
    sections: Joi.array().items(
      Joi.object({
        sectionName: Joi.string().trim().max(10).required(),
        classIncharge: Joi.object({
          name: Joi.string().trim().max(100).required(),
          email: Joi.string().email().trim().max(255).required(),
          designation: Joi.string().trim().max(100).optional().allow('', null),
          phone: Joi.string().trim().max(30).optional().allow('', null),
        }).required(),
      })
    ).optional(),
    semesters: Joi.array().items(
      Joi.object({
        semNumber: Joi.number().integer().min(1).max(12).required(),
        subjects: Joi.array().items(
          Joi.object({
            code: Joi.string().trim().max(30).required(),
            title: Joi.string().trim().max(200).required(),
            teacherName: Joi.string().trim().max(100).required(),
            type: Joi.string().valid('theory', 'lab', 'project', 'elective', 'special').required(),
            remarks: Joi.string().trim().max(500).optional().allow('', null),
          })
        ).optional(),
      })
    ).optional(),
  }),

  updateFacultyMappingSchema: Joi.object({
    branchCode: Joi.string().trim().uppercase().min(1).max(20),
    branchName: Joi.string().trim().min(1).max(100),
    department: Joi.string().trim().min(1).max(100),
    hod: Joi.object({
      name: Joi.string().trim().max(100),
      email: Joi.string().email().trim().max(255),
      designation: Joi.string().trim().max(100).optional().allow('', null),
      department: Joi.string().trim().max(100).optional().allow('', null),
    }),
    sections: Joi.array().items(
      Joi.object({
        sectionName: Joi.string().trim().max(10).required(),
        classIncharge: Joi.object({
          name: Joi.string().trim().max(100).required(),
          email: Joi.string().email().trim().max(255).required(),
          designation: Joi.string().trim().max(100).optional().allow('', null),
          phone: Joi.string().trim().max(30).optional().allow('', null),
        }).required(),
      })
    ),
    semesters: Joi.array().items(
      Joi.object({
        semNumber: Joi.number().integer().min(1).max(12).required(),
        subjects: Joi.array().items(
          Joi.object({
            code: Joi.string().trim().max(30).required(),
            title: Joi.string().trim().max(200).required(),
            teacherName: Joi.string().trim().max(100).required(),
            type: Joi.string().valid('theory', 'lab', 'project', 'elective', 'special').required(),
            remarks: Joi.string().trim().max(500).optional().allow('', null),
          })
        ),
      })
    ),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update faculty mapping',
  }),
};

module.exports = facultyMappingValidator;
