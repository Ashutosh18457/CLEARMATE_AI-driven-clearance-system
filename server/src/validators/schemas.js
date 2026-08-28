import Joi from 'joi';

// ─── Auth ───
export const registerSchema = {
  body: Joi.object({
    name: Joi.string().max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('student', 'teacher', 'section_head', 'account_section', 'bus_section', 'class_incharge', 'hod', 'admin').default('student'),
    enrollmentNo: Joi.string().optional().allow(''),
    programId: Joi.string().optional().allow(''),
    currentSemester: Joi.number().integer().min(1).max(10).optional(),
    section: Joi.string().optional().allow(''),
    sectionType: Joi.when('role', { is: 'section_head', then: Joi.string().valid('library', 'accounts', 'bus', 'disciplinary').required(), otherwise: Joi.string().optional() }),
  }),
};

export const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

// ─── Programs ───
export const createProgramSchema = {
  body: Joi.object({
    name: Joi.string().max(100).required(),
    code: Joi.string().max(20).uppercase().required(),
    department: Joi.string().required(),
    isActive: Joi.boolean().optional(),
  }),
};

export const updateProgramSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    name: Joi.string().max(100),
    code: Joi.string().max(20).uppercase(),
    department: Joi.string(),
    isActive: Joi.boolean(),
  }).min(1),
};

// ─── Semesters ───
export const createSemesterSchema = {
  body: Joi.object({
    programId: Joi.string().required(),
    name: Joi.string().required(),
    semNumber: Joi.number().integer().min(1).max(10).required(),
    academicYear: Joi.string().required(),
    type: Joi.string().valid('ODD', 'EVEN').required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    clearanceDeadline: Joi.date().required(),
    isActive: Joi.boolean().optional(),
  }),
};

export const updateSemesterSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    name: Joi.string(),
    semNumber: Joi.number().integer().min(1).max(10),
    academicYear: Joi.string(),
    type: Joi.string().valid('ODD', 'EVEN'),
    startDate: Joi.date(),
    endDate: Joi.date(),
    clearanceDeadline: Joi.date(),
    isActive: Joi.boolean(),
  }).min(1),
};

// ─── Batches ───
export const createBatchSchema = {
  body: Joi.object({
    semesterId: Joi.string().required(),
    name: Joi.string().required(),
  }),
};

export const assignStudentsSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    studentIds: Joi.array().items(Joi.string()).required(),
  }),
};

// ─── Users ───
export const createUserSchema = {
  body: Joi.object({
    name: Joi.string().max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('student', 'teacher', 'section_head', 'account_section', 'bus_section', 'library_section', 'disciplinary_section', 'class_incharge', 'hod', 'admin').required(),
    enrollmentNo: Joi.string().optional(),
    programId: Joi.string().optional(),
    currentSemester: Joi.number().integer().min(1).max(10).optional(),
    section: Joi.string().optional(),
    sectionType: Joi.string().valid('library', 'accounts', 'bus', 'student_section', 'disciplinary').optional(),
  }),
};

export const bulkCreateUsersSchema = {
  body: Joi.object({
    users: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        role: Joi.string().valid('student', 'teacher', 'section_head', 'account_section', 'class_incharge', 'hod', 'admin').default('student'),
        enrollmentNo: Joi.string().optional(),
        programId: Joi.string().optional(),
        currentSemester: Joi.number().integer().optional(),
        section: Joi.string().optional(),
        sectionType: Joi.string().optional(),
      })
    ).min(1).max(200).required(),
  }),
};

export const updateUserSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    name: Joi.string().max(100),
    email: Joi.string().email(),
    password: Joi.string().min(8),
    role: Joi.string().valid('student', 'teacher', 'section_head', 'account_section', 'bus_section', 'library_section', 'disciplinary_section', 'class_incharge', 'hod', 'admin'),
    enrollmentNo: Joi.string(),
    programId: Joi.string(),
    currentSemester: Joi.number().integer().min(1).max(10),
    section: Joi.string(),
    sectionType: Joi.string().valid('library', 'accounts', 'bus', 'student_section', 'disciplinary'),
  }).min(1),
};

// ─── Clearance Items ───
export const createClearanceItemSchema = {
  body: Joi.object({
    semesterId: Joi.string().required(),
    srNo: Joi.number().integer().min(1).required(),
    title: Joi.string().required(),
    type: Joi.string().valid('theory', 'lab', 'elective', 'special').required(),
    subjectCode: Joi.string().optional().allow(''),
    isRequired: Joi.boolean().optional(),
    theoryTeacherId: Joi.string().optional(),
    labBatchTeachers: Joi.array().items(Joi.object({
      batchId: Joi.string().required(),
      teacherId: Joi.string().required(),
    })).optional(),
    electiveGroup: Joi.string().optional().allow(''),
    electiveOptions: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      teacherId: Joi.string().required(),
    })).optional(),
  }),
};

export const updateClearanceItemSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    srNo: Joi.number().integer().min(1),
    title: Joi.string(),
    type: Joi.string().valid('theory', 'lab', 'elective', 'special'),
    subjectCode: Joi.string().allow(''),
    isRequired: Joi.boolean(),
    theoryTeacherId: Joi.string().allow(''),
    labBatchTeachers: Joi.array().items(Joi.object({ batchId: Joi.string().required(), teacherId: Joi.string().required() })),
    electiveGroup: Joi.string().allow(''),
    electiveOptions: Joi.array().items(Joi.object({ name: Joi.string().required(), teacherId: Joi.string().required() })),
  }).min(1),
};

// ─── Submission Items ───
export const createSubmissionItemSchema = {
  body: Joi.object({
    clearanceItemId: Joi.string().required(),
    title: Joi.string().required(),
    type: Joi.string().valid('assignment', 'lab_record', 'project', 'presentation', 'other').required(),
    description: Joi.string().optional().allow(''),
    deadline: Joi.date().required(),
    isRequired: Joi.boolean().optional(),
  }),
};

// ─── Submissions ───
export const submitSubmissionSchema = {
  body: Joi.object({
    submissionItemId: Joi.string().required(),
  }),
};

export const verifySubmissionSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    status: Joi.string().valid('verified', 'rejected').required(),
    remarks: Joi.string().optional().allow(''),
  }),
};

// ─── Clearance Reviews ───
export const reviewClearanceSchema = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    remarks: Joi.string().optional().allow(''),
  }),
};

// ─── Common Params ───
export const idParamSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};
