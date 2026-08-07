const Program = require('../models/Program');
const Semester = require('../models/Semester');
const Batch = require('../models/Batch');
const User = require('../models/User');
const ClearanceItem = require('../models/ClearanceItem');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const adminService = {
  // ══════════════════════════════════════════════
  // PROGRAMS
  // ══════════════════════════════════════════════

  async createProgram(data) {
    const existing = await Program.findOne({ code: data.code });
    if (existing) {
      throw AppError.conflict(`Program with code "${data.code}" already exists`);
    }
    const program = await Program.create(data);
    logger.info('Program created', { programId: program._id, code: program.code });
    return program;
  },

  async getAllPrograms() {
    return await Program.find().sort({ name: 1 });
  },

  async getProgramById(id) {
    const program = await Program.findById(id);
    if (!program) throw AppError.notFound('Program not found');
    return program;
  },

  async updateProgram(id, data) {
    const program = await Program.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!program) throw AppError.notFound('Program not found');
    logger.info('Program updated', { programId: id });
    return program;
  },

  // ══════════════════════════════════════════════
  // SEMESTERS
  // ══════════════════════════════════════════════

  async createSemester(data) {
    // Verify program exists
    const program = await Program.findById(data.programId);
    if (!program) throw AppError.notFound('Program not found');

    const now = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 5);

    const payload = {
      ...data,
      startDate: data.startDate || now,
      endDate: data.endDate || future,
    };

    const semester = await Semester.create(payload);
    logger.info('Semester created', { semesterId: semester._id, programId: data.programId });
    return semester;
  },

  async getSemesters(filters) {
    const query = {};
    if (filters.programId) query.programId = filters.programId;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    return await Semester.find(query)
      .populate('programId', 'name code')
      .sort({ semNumber: 1 });
  },

  async getSemesterById(id) {
    const semester = await Semester.findById(id).populate('programId', 'name code');
    if (!semester) throw AppError.notFound('Semester not found');
    return semester;
  },

  async updateSemester(id, data) {
    const semester = await Semester.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!semester) throw AppError.notFound('Semester not found');
    logger.info('Semester updated', { semesterId: id });
    return semester;
  },

  // ══════════════════════════════════════════════
  // BATCHES
  // ══════════════════════════════════════════════

  async createBatch(data) {
    // Verify semester exists
    const semester = await Semester.findById(data.semesterId);
    if (!semester) throw AppError.notFound('Semester not found');

    const batch = await Batch.create(data);
    logger.info('Batch created', { batchId: batch._id, semesterId: data.semesterId });
    return batch;
  },

  async getBatches(filters) {
    const query = {};
    if (filters.semesterId) query.semesterId = filters.semesterId;

    return await Batch.find(query)
      .populate('studentIds', 'name email enrollmentNo')
      .sort({ name: 1 });
  },

  async addStudentsToBatch(batchId, studentIds) {
    const batch = await Batch.findById(batchId);
    if (!batch) throw AppError.notFound('Batch not found');

    // Verify all student IDs are valid students
    const students = await User.find({ _id: { $in: studentIds }, role: 'student' });
    if (students.length !== studentIds.length) {
      throw AppError.badRequest('One or more student IDs are invalid or do not belong to students');
    }

    // Add students to batch (avoid duplicates using $addToSet)
    const updatedBatch = await Batch.findByIdAndUpdate(
      batchId,
      { $addToSet: { studentIds: { $each: studentIds } } },
      { new: true }
    ).populate('studentIds', 'name email enrollmentNo');

    // Update each student's batchId reference
    await User.updateMany(
      { _id: { $in: studentIds } },
      { $set: { batchId: batchId } }
    );

    logger.info('Students added to batch', { batchId, count: studentIds.length });
    return updatedBatch;
  },

  // ══════════════════════════════════════════════
  // USERS
  // ══════════════════════════════════════════════

  async createUser(data) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw AppError.conflict(`User with email "${data.email}" already exists`);
    }

    const payload = { ...data };

    if (payload.role === 'student') {
      if (!payload.programId) {
        const prog = await Program.findOne();
        if (prog) payload.programId = prog._id;
      }
      if (!payload.enrollmentNo) {
        payload.enrollmentNo = `EN${Date.now().toString().slice(-6)}`;
      }
      if (!payload.currentSemester) payload.currentSemester = 6;
      if (!payload.section) payload.section = 'A';
    }

    if (payload.role === 'section_head' && !payload.sectionType) {
      payload.sectionType = 'library';
    }

    const user = await User.create(payload);
    // Strip password from returned object
    user.password = undefined;
    logger.info('User created', { userId: user._id, role: user.role });
    return user;
  },

  async bulkCreateStudents(data) {
    const { programId, currentSemester, section, defaultPassword, students } = data;

    // Verify program exists
    const program = await Program.findById(programId);
    if (!program) throw AppError.notFound('Program not found');

    const results = { created: [], failed: [] };

    for (const student of students) {
      try {
        const existing = await User.findOne({
          $or: [{ email: student.email }, { enrollmentNo: student.enrollmentNo }],
        });

        if (existing) {
          results.failed.push({
            ...student,
            reason: existing.email === student.email
              ? 'Email already exists'
              : 'Enrollment number already exists',
          });
          continue;
        }

        const newUser = await User.create({
          name: student.name,
          email: student.email,
          enrollmentNo: student.enrollmentNo,
          password: defaultPassword || 'clearmate@123',
          role: 'student',
          programId,
          currentSemester,
          section,
        });

        newUser.password = undefined;
        results.created.push(newUser);
      } catch (error) {
        results.failed.push({ ...student, reason: error.message });
      }
    }

    logger.info('Bulk student creation completed', {
      total: students.length,
      created: results.created.length,
      failed: results.failed.length,
    });

    return results;
  },

  async getUsers(filters) {
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.programId) query.programId = filters.programId;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.section) query.section = filters.section;
    if (filters.currentSemester) query.currentSemester = filters.currentSemester;

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .populate('programId', 'name code')
        .populate('batchId', 'name')
        .select('-password')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async getUserById(id) {
    const user = await User.findById(id)
      .populate('programId', 'name code')
      .populate('batchId', 'name')
      .select('-password');
    if (!user) throw AppError.notFound('User not found');
    return user;
  },

  async updateUser(id, data) {
    // Prevent password update through this endpoint
    delete data.password;
    delete data.role;

    const user = await User.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) throw AppError.notFound('User not found');
    logger.info('User updated', { userId: id });
    return user;
  },

  async deactivateUser(id) {
    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) throw AppError.notFound('User not found');
    logger.info('User deactivated', { userId: id, role: user.role });
    return user;
  },

  // ══════════════════════════════════════════════
  // CLEARANCE ITEMS
  // ══════════════════════════════════════════════

  async createClearanceItem(data) {
    // Verify semester exists
    const semester = await Semester.findById(data.semesterId);
    if (!semester) throw AppError.notFound('Semester not found');

    // Verify teacher references based on type
    if (data.type === 'theory' || data.type === 'special') {
      const teacher = await User.findOne({ _id: data.theoryTeacherId, role: 'teacher' });
      if (!teacher) throw AppError.badRequest('Invalid teacher ID for theory/special item');
    }

    if (data.type === 'lab' && data.labBatchTeachers) {
      for (const mapping of data.labBatchTeachers) {
        const [batch, teacher] = await Promise.all([
          Batch.findById(mapping.batchId),
          User.findOne({ _id: mapping.teacherId, role: 'teacher' }),
        ]);
        if (!batch) throw AppError.badRequest(`Invalid batch ID: ${mapping.batchId}`);
        if (!teacher) throw AppError.badRequest(`Invalid teacher ID: ${mapping.teacherId}`);
      }
    }

    if (data.type === 'elective' && data.electiveOptions) {
      for (const option of data.electiveOptions) {
        const teacher = await User.findOne({ _id: option.teacherId, role: 'teacher' });
        if (!teacher) throw AppError.badRequest(`Invalid teacher ID for elective option "${option.name}"`);
      }
    }

    const item = await ClearanceItem.create(data);
    logger.info('ClearanceItem created', { itemId: item._id, type: item.type });
    return item;
  },

  async getClearanceItems(filters) {
    const query = {};
    if (filters.semesterId) query.semesterId = filters.semesterId;
    if (filters.type) query.type = filters.type;

    return await ClearanceItem.find(query)
      .populate('theoryTeacherId', 'name email')
      .populate('labBatchTeachers.batchId', 'name')
      .populate('labBatchTeachers.teacherId', 'name email')
      .populate('electiveOptions.teacherId', 'name email')
      .sort({ srNo: 1 });
  },

  async updateClearanceItem(id, data) {
    const item = await ClearanceItem.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!item) throw AppError.notFound('Clearance item not found');
    logger.info('ClearanceItem updated', { itemId: id });
    return item;
  },

  async deleteClearanceItem(id) {
    const item = await ClearanceItem.findByIdAndDelete(id);
    if (!item) throw AppError.notFound('Clearance item not found');
    logger.info('ClearanceItem deleted', { itemId: id, title: item.title });
    return item;
  },
};

module.exports = adminService;
