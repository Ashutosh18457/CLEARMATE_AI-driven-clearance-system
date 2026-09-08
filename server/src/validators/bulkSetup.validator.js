const Joi = require('joi');
const { objectId } = require('./common.validator');

const bulkSetupValidator = {
  bulkSetupSchema: Joi.object({
    semesterConfig: Joi.object({
      programCode: Joi.string().trim().uppercase().max(20).optional(),
      program_code: Joi.string().trim().uppercase().max(20).optional(),
      program: Joi.string().trim().max(50).optional(),
      code: Joi.string().trim().max(20).optional(),
      degree: Joi.string().trim().max(50).optional(),
      branch: Joi.string().trim().max(100).optional(),
      department: Joi.string().trim().max(100).optional(),
      name: Joi.string().trim().max(100).optional(),
      semNumber: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string().max(10)).optional(),
      sem_number: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string().max(10)).optional(),
      semester: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string().max(10)).optional(),
      academicYear: Joi.string().trim().max(20).optional(),
      academic_year: Joi.string().trim().max(20).optional(),
      type: Joi.string().valid('ODD', 'EVEN', 'odd', 'even', '').optional().allow('', null),
      startDate: Joi.alternatives().try(Joi.date(), Joi.string().allow('', null), Joi.number().allow(null)).optional(),
      start_date: Joi.alternatives().try(Joi.date(), Joi.string().allow('', null), Joi.number().allow(null)).optional(),
      endDate: Joi.alternatives().try(Joi.date(), Joi.string().allow('', null), Joi.number().allow(null)).optional(),
      end_date: Joi.alternatives().try(Joi.date(), Joi.string().allow('', null), Joi.number().allow(null)).optional(),
      clearanceDeadline: Joi.alternatives().try(Joi.date(), Joi.string().allow('', null), Joi.number().allow(null)).optional(),
      clearance_deadline: Joi.alternatives().try(Joi.date(), Joi.string().allow('', null), Joi.number().allow(null)).optional(),
      deadline: Joi.alternatives().try(Joi.date(), Joi.string().allow('', null), Joi.number().allow(null)).optional(),
    }).unknown(true).required(),

    clearanceItems: Joi.array()
      .items(
        Joi.object({
          srNo: Joi.number().integer().min(1).optional(),
          sr_no: Joi.number().integer().min(1).optional(),
          title: Joi.string().trim().max(200).optional(),
          Title: Joi.string().trim().max(200).optional(),
          subject_name: Joi.string().trim().max(200).optional(),
          subject: Joi.string().trim().max(200).optional(),
          course_title: Joi.string().trim().max(200).optional(),
          type: Joi.string().optional(),
          Type: Joi.string().optional(),
          course_type: Joi.string().optional(),
          item_type: Joi.string().optional(),
          subjectCode: Joi.string().trim().max(100).optional().allow('', null),
          subject_code: Joi.string().trim().max(100).optional().allow('', null),
          code: Joi.string().trim().max(100).optional().allow('', null),
          course_code: Joi.string().trim().max(100).optional().allow('', null),
          teacherEmail: Joi.string().email({ tlds: { allow: false } }).trim().max(255).optional().allow('', null),
          teacher_email: Joi.string().email({ tlds: { allow: false } }).trim().max(255).optional().allow('', null),
          faculty_email: Joi.string().email({ tlds: { allow: false } }).trim().max(255).optional().allow('', null),
          teacher: Joi.string().trim().max(255).optional().allow('', null),
          faculty: Joi.string().trim().max(255).optional().allow('', null),
          labBatches: Joi.any().optional().allow('', null),
          lab_batches: Joi.any().optional().allow('', null),
          electiveGroup: Joi.string().trim().max(50).optional().allow('', null),
          elective_group: Joi.string().trim().max(50).optional().allow('', null),
          electiveOptions: Joi.any().optional().allow('', null),
          elective_options: Joi.any().optional().allow('', null),
          isRequired: Joi.boolean().optional(),
          is_required: Joi.boolean().optional(),
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
          enrollmentNo: Joi.string().trim().max(50).optional().allow('', null),
          enrollment_no: Joi.string().trim().max(50).optional().allow('', null),
          roll_no: Joi.string().trim().max(50).optional().allow('', null),
          rollNo: Joi.string().trim().max(50).optional().allow('', null),
          name: Joi.string().trim().max(100).optional().allow('', null),
          full_name: Joi.string().trim().max(100).optional().allow('', null),
          student_name: Joi.string().trim().max(100).optional().allow('', null),
          email: Joi.string().email({ tlds: { allow: false } }).max(255).required().messages({
            'any.required': 'Student email is required',
          }),
          section: Joi.string().trim().max(10).optional().allow('', null).default('A'),
          batch: Joi.string().trim().max(20).optional().allow('', null),
          electiveChoice: Joi.string().trim().max(100).optional().allow('', null),
          elective_choice: Joi.string().trim().max(100).optional().allow('', null),
        }).unknown(true) // Allow dynamic elective columns from template (e.g. elective_1, pe_1, pe_2, pe_3)
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one student must be included in the roster',
      }),
  }),

  cloneSemesterSchema: Joi.object({
    sourceSemesterId: objectId.required().messages({
      'any.required': 'Source Semester ID is required for cloning',
      'any.invalid': 'Invalid Source Semester ID format',
    }),
    newAcademicYear: Joi.string().trim().max(20).required().messages({
      'any.required': 'New Academic Year is required (e.g. 2025-26)',
    }),
    students: Joi.array()
      .items(
        Joi.object({
          enrollmentNo: Joi.string().trim().max(50).optional(),
          enrollment_no: Joi.string().trim().max(50).optional(),
          name: Joi.string().trim().max(100).optional(),
          full_name: Joi.string().trim().max(100).optional(),
          email: Joi.string().email({ tlds: { allow: false } }).max(255).required(),
          section: Joi.string().trim().max(10).optional().default('A'),
          batch: Joi.string().trim().max(20).optional().allow(''),
          electiveChoice: Joi.string().trim().max(100).optional().allow(''),
          elective_choice: Joi.string().trim().max(100).optional().allow(''),
        }).unknown(true)
      )
      .optional()
      .default([]),
  }),
};

module.exports = bulkSetupValidator;
