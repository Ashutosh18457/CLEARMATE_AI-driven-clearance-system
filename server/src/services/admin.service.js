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

  async getAllPrograms(filters = {}) {
    const query = {};
    if (filters.degree && filters.degree !== 'ALL') {
      query.degree = filters.degree;
    }
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive === 'true' || filters.isActive === true;
    }
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
        { branch: { $regex: filters.search, $options: 'i' } },
        { department: { $regex: filters.search, $options: 'i' } },
      ];
    }
    return await Program.find(query)
      .populate('departmentAdminId', 'name email role')
      .populate('hodId', 'name email role')
      .sort({ degree: 1, name: 1 });
  },

  async getProgramById(id) {
    const program = await Program.findById(id)
      .populate('departmentAdminId', 'name email role')
      .populate('hodId', 'name email role');
    if (!program) throw AppError.notFound('Program not found');
    return program;
  },

  async updateProgram(id, data) {
    const program = await Program.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    })
      .populate('departmentAdminId', 'name email role')
      .populate('hodId', 'name email role');
    if (!program) throw AppError.notFound('Program not found');

    // Bi-directional sync: if departmentAdminId is set, update User's programId
    if (data.departmentAdminId) {
      await User.findByIdAndUpdate(data.departmentAdminId, { programId: id });
    }
    if (data.hodId) {
      await User.findByIdAndUpdate(data.hodId, { programId: id });
    }

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

  async getSemesters(filters = {}) {
    const query = {};
    if (filters.programId) query.programId = filters.programId;
    if (filters.academicYear && filters.academicYear !== 'ALL') query.academicYear = filters.academicYear;
    if (filters.type && filters.type !== 'ALL') query.type = filters.type;
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive === 'true' || filters.isActive === true;
    }
    if (filters.year && filters.year !== 'ALL') {
      const yr = Number(filters.year);
      if (yr >= 1 && yr <= 5) {
        query.semNumber = { $in: [yr * 2 - 1, yr * 2] };
      }
    }
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { academicYear: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return await Semester.find(query)
      .populate('programId', 'name code degree branch department')
      .sort({ academicYear: -1, semNumber: 1 });
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

  async createUser(data, requester) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw AppError.conflict(`User with email "${data.email}" already exists`);
    }

    const payload = { ...data };
    payload.password = payload.password || 'Pass@123';

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
    user.password = undefined;

    const AuditLog = require('../models/AuditLog');
    new AuditLog({
      userId: requester ? requester.id : null,
      action: 'account_created',
      resource: 'User',
      details: { targetUserId: user._id, role: user.role, email: user.email },
    }).save().catch(() => {});

    logger.info('User created', { userId: user._id, role: user.role });
    return user;
  },

  async bulkCreateStudents(data, requester) {
    const { programId, currentSemester, section, defaultPassword, students } = data;

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
          password: defaultPassword || 'Pass@123',
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

    const AuditLog = require('../models/AuditLog');
    new AuditLog({
      userId: requester ? requester.id : null,
      action: 'bulk_account_created',
      resource: 'User',
      details: { count: results.created.length },
    }).save().catch(() => {});

    logger.info('Bulk student creation completed', {
      total: students.length,
      created: results.created.length,
      failed: results.failed.length,
    });

    return results;
  },

  /**
   * Processes a CSV string to bulk-create student accounts.
   */
  async bulkUploadStudentsCsv(data, requester) {
    const { csvContent, defaultPassword, filename } = data;
    if (!csvContent || typeof csvContent !== 'string' || !csvContent.trim()) {
      throw AppError.badRequest('CSV content is empty or invalid');
    }

    const { parseCsv } = require('../utils/csvParser');
    const { headers, normalizedHeaders, rows } = parseCsv(csvContent);

    if (!headers || headers.length === 0 || rows.length === 0) {
      throw AppError.badRequest('CSV file is empty or contains no data rows');
    }

    // Required columns validation
    const requiredKeys = ['enrollmentNo', 'name', 'email', 'department', 'semester', 'section'];
    const missingKeys = requiredKeys.filter((k) => !normalizedHeaders.includes(k));

    if (missingKeys.length > 0) {
      throw AppError.badRequest(`Missing required column headers in CSV: ${missingKeys.join(', ')}. Expected headers: student_id, full_name, email, department, semester, section`);
    }

    // Load all programs for mapping department string (code or name) to programId
    const programs = await Program.find();
    const programMap = {};
    for (const p of programs) {
      if (p.code) programMap[p.code.toUpperCase()] = p._id;
      if (p.name) programMap[p.name.toUpperCase()] = p._id;
      if (p.department) programMap[p.department.toUpperCase()] = p._id;
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

    const seenEmailsInFile = new Set();
    const seenEnrollmentsInFile = new Set();

    const createdUsers = [];
    const errors = [];

    // Pre-fetch existing users in DB to check collisions
    const fileEmails = rows.map((r) => r.normalized.email?.toLowerCase().trim()).filter(Boolean);
    const fileEnrollments = rows.map((r) => r.normalized.enrollmentNo?.trim()).filter(Boolean);

    const existingDbUsers = await User.find({
      $or: [{ email: { $in: fileEmails } }, { enrollmentNo: { $in: fileEnrollments } }],
    }).select('email enrollmentNo');

    const existingEmailSet = new Set(existingDbUsers.map((u) => u.email.toLowerCase()));
    const existingEnrollmentSet = new Set(existingDbUsers.map((u) => (u.enrollmentNo ? u.enrollmentNo.trim() : '')));

    for (const item of rows) {
      const lineNo = item.line;
      const r = item.normalized;

      const name = r.name ? r.name.trim() : '';
      const email = r.email ? r.email.toLowerCase().trim() : '';
      const enrollmentNo = r.enrollmentNo ? r.enrollmentNo.trim() : '';
      const deptStr = r.department ? r.department.toUpperCase().trim() : '';
      const semesterNum = parseInt(r.semester, 10);
      const section = r.section ? r.section.trim().toUpperCase() : 'A';

      // 1. Required fields check
      if (!name || !email || !enrollmentNo || !deptStr || isNaN(semesterNum)) {
        errors.push({
          row: lineNo,
          email: email || 'N/A',
          reason: 'Missing required fields (student_id, full_name, email, department, or semester)',
        });
        continue;
      }

      // 2. Email format check
      if (!emailRegex.test(email)) {
        errors.push({ row: lineNo, email, reason: 'Invalid email address format' });
        continue;
      }

      // 3. Semester range check (1 to 8)
      if (semesterNum < 1 || semesterNum > 8) {
        errors.push({ row: lineNo, email, reason: `Semester value (${semesterNum}) must be between 1 and 8` });
        continue;
      }

      // 4. Department / Program code resolution
      const programId = programMap[deptStr] || (programs[0] ? programs[0]._id : null);
      if (!programId) {
        errors.push({ row: lineNo, email, reason: `Department/Program "${deptStr}" not recognized` });
        continue;
      }

      // 5. In-file duplicate check
      if (seenEmailsInFile.has(email)) {
        errors.push({ row: lineNo, email, reason: 'Duplicate email address within this CSV file' });
        continue;
      }
      if (seenEnrollmentsInFile.has(enrollmentNo)) {
        errors.push({ row: lineNo, email, reason: 'Duplicate student_id/enrollment_no within this CSV file' });
        continue;
      }

      // 6. DB duplicate check
      if (existingEmailSet.has(email)) {
        errors.push({ row: lineNo, email, reason: 'An account with this email address already exists in database' });
        continue;
      }
      if (existingEnrollmentSet.has(enrollmentNo)) {
        errors.push({ row: lineNo, email, reason: 'An account with this student_id/enrollment_no already exists in database' });
        continue;
      }

      seenEmailsInFile.add(email);
      seenEnrollmentsInFile.add(enrollmentNo);

      try {
        const newUser = await User.create({
          name,
          email,
          enrollmentNo,
          password: defaultPassword || 'Pass@123',
          role: 'student',
          programId,
          currentSemester: semesterNum,
          section: section || 'A',
        });
        newUser.password = undefined;
        createdUsers.push(newUser);
      } catch (err) {
        errors.push({ row: lineNo, email, reason: err.message });
      }
    }

    const AuditLog = require('../models/AuditLog');
    new AuditLog({
      userId: requester ? requester.id : null,
      action: 'bulk_student_upload',
      resource: 'User',
      details: {
        filename: filename || 'uploaded_students.csv',
        totalRows: rows.length,
        createdCount: createdUsers.length,
        failedCount: errors.length,
      },
    }).save().catch(() => {});

    logger.info('Bulk student CSV upload completed', {
      totalRows: rows.length,
      createdCount: createdUsers.length,
      failedCount: errors.length,
    });

    return {
      totalRows: rows.length,
      createdCount: createdUsers.length,
      failedCount: errors.length,
      created: createdUsers,
      errors,
    };
  },

  getSampleCsvTemplate() {
    return 'student_id,full_name,email,department,semester,section\n' +
      'EN2024CSE001,Aarav Sharma,aarav.sharma@sbjain.edu.in,CSE,6,A\n' +
      'EN2024CSE002,Ananya Patel,ananya.patel@sbjain.edu.in,CSE,6,A\n' +
      'EN2024ECE001,Rohan Verma,rohan.verma@sbjain.edu.in,ECE,4,B\n';
  },

  async getUsers(filters, requester) {
    const query = {};
    if (filters.role) {
      if (filters.role.includes(',')) {
        query.role = { $in: filters.role.split(',').map((r) => r.trim()) };
      } else {
        query.role = filters.role;
      }
    }
    if (filters.search && filters.search.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { enrollmentNo: searchRegex },
      ];
    }
    if (filters.programId) query.programId = filters.programId;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.section) query.section = filters.section;
    if (filters.currentSemester) query.currentSemester = filters.currentSemester;

    // HOD department scoping
    if (requester && requester.role === 'hod') {
      const hodUser = await User.findById(requester.id);
      if (hodUser && hodUser.programId) {
        query.programId = hodUser.programId;
      }
    }

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .populate('programId', 'name code')
        .populate('assignedProgramId', 'name code')
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

  async getUserById(id, requester) {
    const user = await User.findById(id)
      .populate('programId', 'name code')
      .populate('batchId', 'name')
      .select('-password');
    if (!user) throw AppError.notFound('User not found');

    if (requester && requester.role === 'hod') {
      const hodUser = await User.findById(requester.id);
      if (
        hodUser &&
        hodUser.programId &&
        user.programId &&
        hodUser.programId.toString() !== user.programId._id.toString()
      ) {
        throw AppError.forbidden('You are only authorized to view accounts in your department');
      }
    }

    return user;
  },

  async updateUser(id, data, requester) {
    const targetUser = await User.findById(id);
    if (!targetUser) throw AppError.notFound('User not found');

    if (requester && requester.role === 'hod') {
      if (targetUser.role === 'admin' || targetUser.role === 'hod') {
        throw AppError.forbidden('HOD cannot modify Admin or HOD accounts');
      }
      const hodUser = await User.findById(requester.id);
      if (
        hodUser &&
        hodUser.programId &&
        targetUser.programId &&
        hodUser.programId.toString() !== targetUser.programId.toString()
      ) {
        throw AppError.forbidden('You are only authorized to modify accounts in your department');
      }
    }

    if (targetUser.role === 'admin' && data.isActive === false) {
      throw AppError.badRequest('Admin accounts cannot be deactivated.');
    }

    if (requester && requester.role !== 'admin') {
      delete data.role;
    }

    if (data.password && typeof data.password === 'string' && data.password.trim().length > 0) {
      targetUser.password = data.password.trim();
    }
    delete data.password;

    Object.keys(data).forEach((key) => {
      targetUser[key] = data[key];
    });

    await targetUser.save();
    targetUser.password = undefined;

    const user = targetUser;

    const AuditLog = require('../models/AuditLog');
    new AuditLog({
      userId: requester ? requester.id : null,
      action: 'account_updated',
      resource: 'User',
      details: { targetUserId: id, updatedFields: Object.keys(data) },
    }).save().catch(() => {});

    logger.info('User updated', { userId: id, updatedBy: requester ? requester.id : 'system' });
    return user;
  },

  async deactivateUser(id, requester) {
    const targetUser = await User.findById(id);
    if (!targetUser) throw AppError.notFound('User not found');

    if (targetUser.role === 'admin') {
      throw AppError.badRequest('Admin accounts cannot be deactivated.');
    }

    targetUser.isActive = false;
    await targetUser.save({ validateBeforeSave: false });

    const AuditLog = require('../models/AuditLog');
    new AuditLog({
      userId: requester ? requester.id : null,
      action: 'account_deactivated',
      resource: 'User',
      details: { targetUserId: id, role: targetUser.role },
    }).save().catch(() => {});

    logger.info('User deactivated', { userId: id, role: targetUser.role });
    return targetUser;
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

  async assignClassIncharge(classInchargeId, data) {
    const ci = await User.findById(classInchargeId);
    if (!ci) throw AppError.notFound('User not found');
    if (ci.role !== 'class_incharge' && ci.role !== 'teacher' && ci.role !== 'admin') {
      throw AppError.badRequest('User must have class_incharge or teacher role');
    }

    const { assignedProgramId, assignedSemester, assignedSection, assignedStudents } = data;

    let studentIds = Array.isArray(assignedStudents) ? assignedStudents : [];

    if (studentIds.length === 0 && (assignedSection || assignedProgramId || assignedSemester)) {
      const studentQuery = { role: 'student' };
      if (assignedProgramId) studentQuery.programId = assignedProgramId;
      if (assignedSemester) studentQuery.currentSemester = assignedSemester;
      if (assignedSection && assignedSection !== 'all') studentQuery.section = assignedSection;
      const matched = await User.find(studentQuery).select('_id');
      studentIds = matched.map((s) => s._id);
    }

    ci.assignedProgramId = assignedProgramId || undefined;
    ci.assignedSemester = assignedSemester || undefined;
    ci.assignedSection = assignedSection || undefined;
    ci.assignedStudents = studentIds;

    await ci.save();

    logger.info('Class Incharge assignment updated', {
      classInchargeId: ci._id,
      assignedSection,
      studentCount: studentIds.length,
    });

    return await User.findById(ci._id)
      .populate('assignedProgramId', 'name code')
      .populate('assignedStudents', 'name email enrollmentNo section')
      .select('-password');
  },

  async getClassIncharges() {
    return await User.find({ role: 'class_incharge' })
      .populate('assignedProgramId', 'name code')
      .populate('assignedStudents', 'name email enrollmentNo section')
      .select('-password')
      .sort({ name: 1 });
  },

  // ══════════════════════════════════════════════
  // AUDIT LOGS (Super Admin)
  // ══════════════════════════════════════════════

  async getAuditLogs(filters = {}) {
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (filters.action) query.action = filters.action;
    if (filters.userId) query.userId = filters.userId;

    const AuditLog = require('../models/AuditLog');
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },
};

module.exports = adminService;
