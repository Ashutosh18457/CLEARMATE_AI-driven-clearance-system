const Joi = require('joi');
const { objectId } = require('./common.validator');

const adminValidator = {
  // ──────────────────────────────────────────────
  // PROGRAMS
  // ──────────────────────────────────────────────
  createProgramSchema: Joi.object({
    name: Joi.string().trim().min(1).max(100).required()
      .messages({ 'any.required': 'Program name is required' }),
    code: Joi.string().trim().uppercase().min(1).max(20).required()
      .messages({ 'any.required': 'Program code is required' }),
    degree: Joi.string().trim().max(50).optional().default('B.Tech'),
    branch: Joi.string().trim().max(100).optional().allow('', null),
    totalSemesters: Joi.number().integer().min(1).max(12).optional().default(8),
    department: Joi.string().trim().min(1).max(100).required()
      .messages({ 'any.required': 'Department is required' }),
    departmentAdminId: objectId.optional().allow('', null),
    hodId: objectId.optional().allow('', null),
    isActive: Joi.boolean().optional(),
  }),

  updateProgramSchema: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    code: Joi.string().trim().uppercase().min(1).max(20),
    degree: Joi.string().trim().max(50),
    branch: Joi.string().trim().max(100).allow('', null),
    totalSemesters: Joi.number().integer().min(1).max(12),
    department: Joi.string().trim().min(1).max(100),
    departmentAdminId: objectId.optional().allow('', null),
    hodId: objectId.optional().allow('', null),
    isActive: Joi.boolean(),
  }).min(1).messages({ 'object.min': 'At least one field must be provided for update' }),

  // ──────────────────────────────────────────────
  // SEMESTERS
  // ──────────────────────────────────────────────
  createSemesterSchema: Joi.object({
    programId: objectId.required()
      .messages({ 'any.required': 'Program ID is required', 'any.invalid': 'Invalid Program ID format' }),
    name: Joi.string().trim().min(1).max(100).required()
      .messages({ 'any.required': 'Semester name is required' }),
    semNumber: Joi.number().integer().min(1).max(12).required()
      .messages({ 'any.required': 'Semester number is required' }),
    academicYear: Joi.string().trim().max(20).required()
      .messages({ 'any.required': 'Academic year is required' }),
    type: Joi.string().valid('ODD', 'EVEN').required()
      .messages({ 'any.required': 'Semester type (ODD/EVEN) is required' }),
    studyYear: Joi.alternatives().try(Joi.number().integer().min(1).max(6), Joi.string().max(20)).optional().allow('', null),
    startDate: Joi.date().iso().optional().allow('', null),
    endDate: Joi.date().iso().optional().allow('', null),
    clearanceDeadline: Joi.date().iso().required()
      .messages({ 'any.required': 'Clearance deadline is required' }),
    isActive: Joi.boolean().optional(),
  }),

  updateSemesterSchema: Joi.object({
    programId: objectId.optional().allow('', null),
    name: Joi.string().trim().min(1).max(100),
    semNumber: Joi.number().integer().min(1).max(12),
    academicYear: Joi.string().trim().max(20),
    type: Joi.string().valid('ODD', 'EVEN'),
    studyYear: Joi.alternatives().try(Joi.number().integer().min(1).max(6), Joi.string().max(20)).optional().allow('', null),
    startDate: Joi.date().iso().optional().allow('', null),
    endDate: Joi.date().iso().optional().allow('', null),
    clearanceDeadline: Joi.date().iso().optional().allow('', null),
    isActive: Joi.boolean(),
  }).min(1).messages({ 'object.min': 'At least one field must be provided for update' }),

  // ──────────────────────────────────────────────
  // BATCHES
  // ──────────────────────────────────────────────
  createBatchSchema: Joi.object({
    semesterId: objectId.required()
      .messages({ 'any.required': 'Semester ID is required', 'any.invalid': 'Invalid Semester ID format' }),
    name: Joi.string().trim().min(1).max(50).required()
      .messages({ 'any.required': 'Batch name is required' }),
  }),

  addStudentsToBatchSchema: Joi.object({
    studentIds: Joi.array().items(objectId).min(1).required()
      .messages({ 'any.required': 'Student IDs array is required', 'array.min': 'At least one student ID is required' }),
  }),

  // ──────────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────────
  createUserSchema: Joi.object({
    name: Joi.string().trim().min(1).max(100).required()
      .messages({ 'any.required': 'Name is required' }),
    email: Joi.string().email().trim().max(255).required()
      .messages({ 'any.required': 'Email is required' }),
    password: Joi.string().min(8).max(128).optional().default('Pass@123')
      .messages({ 'string.min': 'Password must be at least 8 characters' }),
    role: Joi.string()
      .valid('student', 'teacher', 'section_head', 'account_section', 'bus_section', 'library_section', 'disciplinary_section', 'class_incharge', 'hod', 'admin', 'super_admin')
      .required()
      .messages({ 'any.required': 'Role is required' }),
    programId: objectId.optional().allow('', null),
    enrollmentNo: Joi.string().trim().max(50).optional().allow('', null),
    currentSemester: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string().max(10).allow('', null)).optional(),
    section: Joi.string().trim().max(10).optional().allow('', null),
    assignedProgramId: objectId.optional().allow('', null),
    assignedSemester: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string().max(10).allow('', null)).optional().allow('', null),
    assignedSection: Joi.string().trim().max(10).optional().allow('', null),
    assignedStudents: Joi.array().items(objectId).optional(),
    sectionType: Joi.string().valid('library', 'accounts', 'bus', 'student_section', 'disciplinary').optional().allow('', null),
    isActive: Joi.boolean().optional(),
  }),

  bulkCreateStudentsSchema: Joi.object({
    programId: objectId.required()
      .messages({ 'any.required': 'Program ID is required' }),
    currentSemester: Joi.number().integer().min(1).max(12).required()
      .messages({ 'any.required': 'Current semester is required' }),
    section: Joi.string().trim().max(10).required()
      .messages({ 'any.required': 'Section is required' }),
    defaultPassword: Joi.string().min(8).max(128).default('Pass@123'),
    students: Joi.array().items(
      Joi.object({
        name: Joi.string().trim().min(1).max(100).required(),
        email: Joi.string().email().trim().max(255).required(),
        enrollmentNo: Joi.string().trim().min(1).max(50).required(),
      })
    ).min(1).max(500).required()
      .messages({ 'any.required': 'Students array is required', 'array.min': 'At least one student is required' }),
  }),

  bulkUploadStudentsCsvSchema: Joi.object({
    programId: objectId.required().messages({ 'any.required': 'Program ID is required' }),
    currentSemester: Joi.number().integer().min(1).max(12).required().messages({ 'any.required': 'Semester is required' }),
    section: Joi.string().trim().max(10).required().messages({ 'any.required': 'Section is required' }),
    csvData: Joi.string().min(1).optional(),
    students: Joi.array().items(
      Joi.object({
        name: Joi.string().trim().max(100).required(),
        email: Joi.string().email().trim().max(255).required(),
        enrollmentNo: Joi.string().trim().max(50).required(),
      })
    ).optional(),
  }),

  updateUserSchema: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    email: Joi.string().email().trim().max(255),
    password: Joi.string().min(8).max(128).optional().allow('', null),
    role: Joi.string().valid('student', 'teacher', 'section_head', 'account_section', 'bus_section', 'library_section', 'disciplinary_section', 'class_incharge', 'hod', 'admin', 'super_admin'),
    programId: objectId.optional().allow('', null),
    enrollmentNo: Joi.string().trim().max(50).optional().allow('', null),
    currentSemester: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string().max(10).allow('', null)).optional(),
    section: Joi.string().trim().max(10).optional().allow('', null),
    sectionType: Joi.string().valid('library', 'accounts', 'bus', 'student_section', 'disciplinary').optional().allow('', null),
    assignedProgramId: objectId.optional().allow('', null),
    assignedSemester: Joi.alternatives().try(Joi.number().integer().min(1).max(12), Joi.string().max(10).trim().allow('', null)).optional().allow('', null),
    assignedSection: Joi.string().trim().max(10).optional().allow('', null),
    assignedStudents: Joi.array().items(objectId).optional(),
    isActive: Joi.boolean(),
  }).min(1).messages({ 'object.min': 'At least one field must be provided for update' }),

  // ──────────────────────────────────────────────
  // CLEARANCE ITEMS
  // ──────────────────────────────────────────────
  createClearanceItemSchema: Joi.object({
    semesterId: objectId.required()
      .messages({ 'any.required': 'Semester ID is required' }),
    srNo: Joi.number().integer().min(1).required()
      .messages({ 'any.required': 'Serial number is required' }),
    title: Joi.string().trim().min(1).max(200).required()
      .messages({ 'any.required': 'Title is required' }),
    type: Joi.string().valid('theory', 'lab', 'elective', 'elective_lab', 'special').required()
      .messages({ 'any.required': 'Item type is required' }),
    subjectCode: Joi.string().trim().max(100).optional().allow('', null),
    isRequired: Joi.boolean().default(true),
    theoryTeacherId: objectId.optional().allow('', null),
    labBatchTeachers: Joi.array().items(
      Joi.object({
        batchId: objectId.required(),
        teacherId: objectId.required(),
      })
    ).optional(),
    electiveGroup: Joi.when('type', {
      is: Joi.string().valid('elective', 'elective_lab'),
      then: Joi.string().trim().max(50).required(),
      otherwise: Joi.string().trim().max(50).optional().allow('', null),
    }),
    electiveOptions: Joi.when('type', {
      is: Joi.string().valid('elective', 'elective_lab'),
      then: Joi.array().items(
        Joi.object({
          name: Joi.string().trim().min(1).max(100).required(),
          teacherId: objectId.optional().allow('', null),
          labBatchTeachers: Joi.array().items(
            Joi.object({
              batchId: objectId.required(),
              teacherId: objectId.required(),
            })
          ).optional(),
        })
      ).min(1).required(),
      otherwise: Joi.array().optional(),
    }),
  }),

  updateClearanceItemSchema: Joi.object({
    srNo: Joi.number().integer().min(1),
    title: Joi.string().trim().min(1).max(200),
    type: Joi.string().valid('theory', 'lab', 'elective', 'elective_lab', 'special'),
    subjectCode: Joi.string().trim().max(100).allow('', null),
    isRequired: Joi.boolean(),
    theoryTeacherId: objectId.optional().allow('', null),
    labBatchTeachers: Joi.array().items(
      Joi.object({
        batchId: objectId.required(),
        teacherId: objectId.required(),
      })
    ).optional(),
    electiveGroup: Joi.string().trim().max(50).optional().allow('', null),
    electiveOptions: Joi.array().items(
      Joi.object({
        name: Joi.string().trim().min(1).max(100).required(),
        teacherId: objectId.optional().allow('', null),
        labBatchTeachers: Joi.array().items(
          Joi.object({
            batchId: objectId.required(),
            teacherId: objectId.required(),
          })
        ).optional(),
      })
    ).optional(),
  }).min(1).messages({ 'object.min': 'At least one field must be provided for update' }),

  // ──────────────────────────────────────────────
  // CLASS INCHARGE ASSIGNMENT
  // ──────────────────────────────────────────────
  assignClassInchargeSchema: Joi.object({
    assignedProgramId: objectId.required().messages({ 'any.required': 'Assigned program ID is required' }),
    assignedSemester: Joi.number().integer().min(1).max(12).required().messages({ 'any.required': 'Assigned semester number is required' }),
    assignedSection: Joi.string().trim().max(10).required().messages({ 'any.required': 'Assigned section is required' }),
    assignedStudents: Joi.array().items(objectId).optional(),
  }),
};

module.exports = adminValidator;
