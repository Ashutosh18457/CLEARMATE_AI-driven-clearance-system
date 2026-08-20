const Joi = require('joi');
const mongoose = require('mongoose');

// Custom ObjectId validator
const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation');

const adminValidator = {
  // ──────────────────────────────────────────────
  // PROGRAMS
  // ──────────────────────────────────────────────
  createProgramSchema: Joi.object({
    name: Joi.string().trim().max(100).required()
      .messages({ 'any.required': 'Program name is required' }),
    code: Joi.string().trim().uppercase().max(20).required()
      .messages({ 'any.required': 'Program code is required' }),
    degree: Joi.string().trim().optional().default('B.Tech'),
    branch: Joi.string().trim().optional().allow('', null),
    totalSemesters: Joi.number().integer().min(1).max(12).optional().default(8),
    department: Joi.string().trim().required()
      .messages({ 'any.required': 'Department is required' }),
    departmentAdminId: objectId.optional().allow('', null),
    hodId: objectId.optional().allow('', null),
    isActive: Joi.boolean().optional(),
  }),

  updateProgramSchema: Joi.object({
    name: Joi.string().trim().max(100),
    code: Joi.string().trim().uppercase().max(20),
    degree: Joi.string().trim().optional(),
    branch: Joi.string().trim().optional().allow('', null),
    totalSemesters: Joi.number().integer().min(1).max(12).optional(),
    department: Joi.string().trim(),
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
    name: Joi.string().trim().required()
      .messages({ 'any.required': 'Semester name is required' }),
    semNumber: Joi.number().integer().min(1).max(10).required()
      .messages({ 'any.required': 'Semester number is required' }),
    academicYear: Joi.string().trim().required()
      .messages({ 'any.required': 'Academic year is required' }),
    type: Joi.string().valid('ODD', 'EVEN').required()
      .messages({ 'any.required': 'Semester type (ODD/EVEN) is required' }),
    startDate: Joi.date().iso().optional().allow('', null),
    endDate: Joi.date().iso().optional().allow('', null),
    clearanceDeadline: Joi.date().iso().required()
      .messages({ 'any.required': 'Clearance deadline is required' }),
    isActive: Joi.boolean().optional(),
  }),
 
  updateSemesterSchema: Joi.object({
    programId: objectId.optional().allow('', null),
    name: Joi.string().trim(),
    semNumber: Joi.number().integer().min(1).max(10),
    academicYear: Joi.string().trim(),
    type: Joi.string().valid('ODD', 'EVEN'),
    startDate: Joi.date().iso().optional().allow('', null),
    endDate: Joi.date().iso().optional().allow('', null),
    clearanceDeadline: Joi.date().iso(),
    isActive: Joi.boolean(),
  }).min(1),

  // ──────────────────────────────────────────────
  // BATCHES
  // ──────────────────────────────────────────────
  createBatchSchema: Joi.object({
    semesterId: objectId.required()
      .messages({ 'any.required': 'Semester ID is required', 'any.invalid': 'Invalid Semester ID format' }),
    name: Joi.string().trim().required()
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
    name: Joi.string().trim().max(100).required()
      .messages({ 'any.required': 'Name is required' }),
    email: Joi.string().email().required()
      .messages({ 'any.required': 'Email is required' }),
    password: Joi.string().min(8).optional().default('Pass@123')
      .messages({ 'string.min': 'Password must be at least 8 characters' }),
    role: Joi.string().valid('student', 'teacher', 'section_head', 'account_section', 'bus_section', 'class_incharge', 'hod', 'admin', 'super_admin').required()
      .messages({ 'any.required': 'Role is required' }),
    // Student, Admin, HOD-specific
    programId: objectId.optional().allow('', null),
    enrollmentNo: Joi.string().trim().optional().allow('', null),
    currentSemester: Joi.number().integer().min(1).max(10).optional().allow('', null),
    section: Joi.string().trim().optional().allow('', null),
    // Section Head-specific
    sectionType: Joi.string().valid('library', 'accounts', 'bus', 'student_section').optional().allow('', null),
    // Class Incharge-specific
    assignedProgramId: objectId.optional().allow('', null),
    assignedSemester: Joi.number().integer().min(1).max(10).optional().allow('', null),
    assignedSection: Joi.string().trim().optional().allow('', null),
    assignedStudents: Joi.array().items(objectId).optional(),
    isActive: Joi.boolean().optional(),
  }).unknown(true),

  bulkCreateStudentsSchema: Joi.object({
    programId: objectId.required()
      .messages({ 'any.required': 'Program ID is required' }),
    currentSemester: Joi.number().integer().min(1).max(10).required()
      .messages({ 'any.required': 'Current semester is required' }),
    section: Joi.string().trim().required()
      .messages({ 'any.required': 'Section is required' }),
    defaultPassword: Joi.string().min(8).default('Pass@123'),
    students: Joi.array().items(
      Joi.object({
        name: Joi.string().trim().max(100).required(),
        email: Joi.string().email().required(),
        enrollmentNo: Joi.string().trim().required(),
      })
    ).min(1).required()
      .messages({ 'any.required': 'Students array is required', 'array.min': 'At least one student is required' }),
  }),

  updateUserSchema: Joi.object({
    name: Joi.string().trim().max(100),
    email: Joi.string().email(),
    password: Joi.string().min(8).optional().allow('', null),
    role: Joi.string().valid('student', 'teacher', 'section_head', 'account_section', 'bus_section', 'class_incharge', 'hod', 'admin', 'super_admin'),
    programId: objectId.optional().allow('', null),
    enrollmentNo: Joi.string().trim().optional().allow('', null),
    currentSemester: Joi.number().integer().min(1).max(10).optional().allow('', null),
    section: Joi.string().trim().optional().allow('', null),
    sectionType: Joi.string().valid('library', 'accounts', 'bus', 'student_section').optional().allow('', null),
    assignedProgramId: objectId.optional().allow('', null),
    assignedSemester: Joi.number().integer().min(1).max(10).optional().allow('', null),
    assignedSection: Joi.string().trim().optional().allow('', null),
    assignedStudents: Joi.array().items(objectId).optional(),
    isActive: Joi.boolean(),
  }).min(1).unknown(true),

  // ──────────────────────────────────────────────
  // CLEARANCE ITEMS
  // ──────────────────────────────────────────────
  createClearanceItemSchema: Joi.object({
    semesterId: objectId.required()
      .messages({ 'any.required': 'Semester ID is required' }),
    srNo: Joi.number().integer().min(1).required()
      .messages({ 'any.required': 'Serial number is required' }),
    title: Joi.string().trim().required()
      .messages({ 'any.required': 'Title is required' }),
    type: Joi.string().valid('theory', 'lab', 'elective', 'special').required()
      .messages({ 'any.required': 'Item type is required' }),
    subjectCode: Joi.string().trim().optional(),
    isRequired: Joi.boolean().default(true),
    // Theory/Special
    theoryTeacherId: objectId.optional().allow('', null),
    labBatchTeachers: Joi.array().items(
      Joi.object({
        batchId: objectId.required(),
        teacherId: objectId.required(),
      })
    ).optional(),
    // Elective
    electiveGroup: Joi.when('type', {
      is: 'elective',
      then: Joi.string().trim().required(),
      otherwise: Joi.string().trim().optional(),
    }),
    electiveOptions: Joi.when('type', {
      is: 'elective',
      then: Joi.array().items(
        Joi.object({
          name: Joi.string().trim().required(),
          teacherId: objectId.required(),
        })
      ).min(2).required(),
      otherwise: Joi.array().optional(),
    }),
  }),

  updateClearanceItemSchema: Joi.object({
    srNo: Joi.number().integer().min(1),
    title: Joi.string().trim(),
    subjectCode: Joi.string().trim(),
    isRequired: Joi.boolean(),
    theoryTeacherId: objectId,
    labBatchTeachers: Joi.array().items(
      Joi.object({
        batchId: objectId.required(),
        teacherId: objectId.required(),
      })
    ),
    electiveGroup: Joi.string().trim(),
    electiveOptions: Joi.array().items(
      Joi.object({
        name: Joi.string().trim().required(),
        teacherId: objectId.required(),
      })
    ),
  }).min(1),
};

module.exports = adminValidator;
