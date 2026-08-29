const Joi = require('joi');
const mongoose = require('mongoose');

// Custom ObjectId validator
const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation');

const bulkSetupValidator = {
  bulkSetupSchema: Joi.object({
    semesterConfig: Joi.object({
      programCode: Joi.string().trim().uppercase().optional(),
      program_code: Joi.string().trim().uppercase().optional(),
      semNumber: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string()).optional(),
      sem_number: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string()).optional(),
      academicYear: Joi.string().trim().optional(),
      academic_year: Joi.string().trim().optional(),
      type: Joi.string().optional().allow('', null),
      startDate: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null)).optional(),
      start_date: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null)).optional(),
      endDate: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null)).optional(),
      end_date: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null)).optional(),
      clearanceDeadline: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null)).optional(),
      clearance_deadline: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null)).optional(),
    }).unknown(true).required(),

    clearanceItems: Joi.array()
      .items(
        Joi.object({
          srNo: Joi.number().integer().optional(),
          sr_no: Joi.number().integer().optional(),
          title: Joi.string().trim().optional(),
          Title: Joi.string().trim().optional(),
          subject_name: Joi.string().trim().optional(),
          type: Joi.string().optional(),
          Type: Joi.string().optional(),
          course_type: Joi.string().optional(),
          subjectCode: Joi.string().trim().optional().allow('', null),
          subject_code: Joi.string().trim().optional().allow('', null),
          code: Joi.string().trim().optional().allow('', null),
          teacherEmail: Joi.string().optional().allow('', null),
          teacher_email: Joi.string().optional().allow('', null),
          faculty_email: Joi.string().optional().allow('', null),
          labBatches: Joi.any().optional().allow('', null),
          lab_batches: Joi.any().optional().allow('', null),
          electiveGroup: Joi.string().optional().allow('', null),
          elective_group: Joi.string().optional().allow('', null),
          electiveOptions: Joi.any().optional().allow('', null),
          elective_options: Joi.any().optional().allow('', null),
          isRequired: Joi.boolean().optional(),
        }).unknown(true)
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one clearance item is required in the setup',
      }),

    students: Joi.array()
      .items(
        Joi.object({
          enrollmentNo: Joi.string().trim().optional().allow('', null),
          enrollment_no: Joi.string().trim().optional().allow('', null),
          roll_no: Joi.string().trim().optional().allow('', null),
          name: Joi.string().trim().optional().allow('', null),
          full_name: Joi.string().trim().optional().allow('', null),
          email: Joi.string().email({ tlds: { allow: false } }).required().messages({
            'any.required': 'Student email is required',
          }),
          section: Joi.string().trim().optional().allow('', null).default('A'),
          batch: Joi.string().trim().optional().allow('', null),
          electiveChoice: Joi.string().trim().optional().allow('', null),
          elective_choice: Joi.string().trim().optional().allow('', null),
        }).unknown(true)
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one student must be included in the roster',
      }),
  }).unknown(true),

  cloneSemesterSchema: Joi.object({
    sourceSemesterId: objectId.required().messages({
      'any.required': 'Source Semester ID is required for cloning',
      'any.invalid': 'Invalid Source Semester ID format',
    }),
    newAcademicYear: Joi.string().trim().required().messages({
      'any.required': 'New Academic Year is required (e.g. 2025-26)',
    }),
    students: Joi.array()
      .items(
        Joi.object({
          enrollmentNo: Joi.string().trim().optional(),
          enrollment_no: Joi.string().trim().optional(),
          name: Joi.string().trim().optional(),
          full_name: Joi.string().trim().optional(),
          email: Joi.string().email().required(),
          section: Joi.string().trim().optional().default('A'),
          batch: Joi.string().trim().optional().allow(''),
          electiveChoice: Joi.string().trim().optional().allow(''),
          elective_choice: Joi.string().trim().optional().allow(''),
        })
      )
      .optional()
      .default([]),
  }),
};

module.exports = bulkSetupValidator;
