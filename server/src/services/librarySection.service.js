const mongoose = require('mongoose');
const SectionClearance = require('../models/SectionClearance');
const ClearanceRequest = require('../models/ClearanceRequest');
const User = require('../models/User');
const Program = require('../models/Program');
const Semester = require('../models/Semester');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const notificationService = require('./notification.service');

const librarySectionService = {
  /**
   * Gets list of active branches (programs) and semesters for filtering
   */
  async getBranchesAndSemesters() {
    const programs = await Program.find({ isActive: true }).select('name code branch degree department totalSemesters');
    const semesters = await Semester.find({ isActive: true }).select('name semNumber academicYear programId type');
    return { programs, semesters };
  },

  /**
   * Gets list of students with library clearance status, searchable & paginated.
   * Supports filtering by status, branch (programId), and semester (currentSemester).
   */
  async getStudentsLibraryStatus(queryParams = {}) {
    const page = parseInt(queryParams.page, 10) || 1;
    const limit = parseInt(queryParams.limit, 10) || 50;
    const skip = (page - 1) * limit;
    const search = queryParams.search ? queryParams.search.trim() : '';
    const statusFilter = queryParams.status; // 'paid' | 'not_paid' or 'cleared' | 'pending'
    const programFilter = queryParams.programId || queryParams.program || queryParams.branch;
    const semFilter = queryParams.currentSemester || queryParams.sem || queryParams.semester;

    // Build filter for students
    const studentQuery = { role: 'student' };
    if (search) {
      studentQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { enrollmentNo: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (programFilter && programFilter !== 'all') {
      if (mongoose.Types.ObjectId.isValid(programFilter)) {
        studentQuery.programId = programFilter;
      } else {
        const prog = await Program.findOne({
          $or: [
            { code: new RegExp(`^${programFilter}$`, 'i') },
            { name: new RegExp(programFilter, 'i') },
          ],
        });
        if (prog) studentQuery.programId = prog._id;
      }
    }

    if (semFilter && semFilter !== 'all' && !isNaN(parseInt(semFilter, 10))) {
      studentQuery.currentSemester = parseInt(semFilter, 10);
    }

    const totalStudents = await User.countDocuments(studentQuery);
    const students = await User.find(studentQuery)
      .select('name email enrollmentNo section currentSemester programId')
      .populate('programId', 'name code degree department')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const studentIds = students.map((s) => s._id);

    // Fetch library SectionClearances for these students
    const sectionClearances = await SectionClearance.find({
      studentId: { $in: studentIds },
      department: 'library',
    }).populate('updated_by', 'name email');

    const clearanceMap = new Map();
    sectionClearances.forEach((sc) => {
      clearanceMap.set(sc.studentId.toString(), sc);
    });

    let results = students.map((student) => {
      const sc = clearanceMap.get(student._id.toString());
      const fees_status = sc ? (sc.fees_status || (sc.status === 'approved' ? 'paid' : 'not_paid')) : 'not_paid';
      return {
        student: {
          id: student._id,
          _id: student._id,
          name: student.name,
          email: student.email,
          enrollmentNo: student.enrollmentNo || 'N/A',
          section: student.section || 'N/A',
          currentSemester: student.currentSemester,
          program: student.programId ? student.programId.code : 'N/A',
        },
        library_status: fees_status,
        fees_status: fees_status,
        reason: sc ? sc.reason || null : null,
        remark_text: sc ? sc.remark_text || sc.remarks || '' : '',
        updated_by: sc && sc.updated_by ? { id: sc.updated_by._id, name: sc.updated_by.name } : null,
        updated_at: sc ? sc.updated_at || sc.updatedAt : null,
        auditTrail: sc && sc.auditTrail ? sc.auditTrail : [],
      };
    });

    // Apply status filter if requested
    if (statusFilter === 'paid' || statusFilter === 'cleared') {
      results = results.filter((r) => r.fees_status === 'paid');
    } else if (statusFilter === 'not_paid' || statusFilter === 'pending') {
      results = results.filter((r) => r.fees_status === 'not_paid');
    }

    return {
      students: results,
      pagination: {
        total: totalStudents,
        page,
        limit,
        pages: Math.ceil(totalStudents / limit),
      },
    };
  },

  /**
   * Gets single student library status detail + audit trail
   */
  async getStudentLibraryDetail(studentId) {
    const student = await User.findOne({ _id: studentId }).populate('programId', 'name code degree department');
    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const sc = await SectionClearance.findOne({
      studentId: student._id,
      department: 'library',
    }).populate('updated_by', 'name email');

    const fees_status = sc ? (sc.fees_status || (sc.status === 'approved' ? 'paid' : 'not_paid')) : 'not_paid';

    return {
      student: {
        id: student._id,
        _id: student._id,
        name: student.name,
        email: student.email,
        enrollmentNo: student.enrollmentNo || 'N/A',
        section: student.section || 'N/A',
        currentSemester: student.currentSemester,
        program: student.programId ? student.programId.code : 'N/A',
      },
      library_status: fees_status,
      fees_status: fees_status,
      reason: sc ? sc.reason || null : null,
      remark_text: sc ? sc.remark_text || sc.remarks || '' : '',
      updated_by: sc && sc.updated_by ? { id: sc.updated_by._id, name: sc.updated_by.name } : null,
      updated_at: sc ? sc.updated_at || sc.updatedAt : null,
      auditTrail: sc && sc.auditTrail ? sc.auditTrail : [],
    };
  },

  /**
   * Updates student library status and logs audit trail.
   */
  async updateStudentLibraryStatus(studentId, updateData, updatedByUserId) {
    let { status, fees_status, reason, remark_text } = updateData;
    status = status || fees_status;
    if (status === 'cleared') status = 'paid';
    if (status === 'pending') status = 'not_paid';

    if (status !== 'paid' && status !== 'not_paid') {
      throw AppError.badRequest('Status must be paid/cleared or not_paid/pending');
    }

    const student = await User.findOne({ _id: studentId });
    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const updater = await User.findById(updatedByUserId);
    const updaterName = updater ? updater.name : 'Library Section Head';

    // Find active ClearanceRequest for student if one exists
    const activeRequest = await ClearanceRequest.findOne({
      studentId: student._id,
      status: { $nin: ['fully_cleared', 'rejected'] },
    });

    let sc = await SectionClearance.findOne({
      studentId: student._id,
      department: 'library',
    });

    if (!sc) {
      sc = new SectionClearance({
        clearanceRequestId: activeRequest ? activeRequest._id : undefined,
        studentId: student._id,
        department: 'library',
      });
    } else if (!sc.clearanceRequestId && activeRequest) {
      sc.clearanceRequestId = activeRequest._id;
    }

    // Set library status and department approval status
    sc.fees_status = status;
    sc.status = status === 'paid' ? 'approved' : 'rejected';
    sc.reviewerId = updatedByUserId;
    sc.updated_by = updatedByUserId;
    sc.updated_at = new Date();
    sc.reviewedAt = new Date();

    if (status === 'paid') {
      sc.reason = reason || undefined;
      sc.remark_text = remark_text && remark_text.trim() ? remark_text.trim() : 'Library clearance granted';
      sc.remarks = sc.remark_text;
    } else {
      sc.reason = reason || 'fees_pending';
      sc.remark_text = remark_text && remark_text.trim() ? remark_text.trim() : 'Books or dues pending with Library';
      sc.remarks = sc.remark_text;
    }

    // Add entry to audit trail
    if (!sc.auditTrail) sc.auditTrail = [];
    sc.auditTrail.push({
      status: status,
      reason: status === 'not_paid' ? (reason || 'fees_pending') : null,
      remark_text: sc.remark_text,
      changed_by: updatedByUserId,
      changed_by_name: updaterName,
      changed_at: new Date(),
    });

    await sc.save();

    // Auto-advance clearance request if all section clearances are approved
    if (sc.status === 'approved' && sc.clearanceRequestId) {
      try {
        const clearanceService = require('./clearance.service');
        await clearanceService._checkAndAdvanceFromSections(sc.clearanceRequestId);
      } catch (err) {
        logger.warn('Failed to auto-advance clearance request from library', { error: err.message });
      }
    }

    // Send Notification to student
    try {
      if (status === 'not_paid') {
        const notifMsg = sc.remark_text || 'Library books or dues pending.';
        await notificationService.createNotification(student._id, {
          title: 'Library Clearance Remark 📚',
          message: `Library Section Remark: ${notifMsg}`,
          type: 'warning',
          link: '/dashboard/clearance',
        });
      } else if (status === 'paid') {
        const notifMsg = sc.remark_text || 'Library clearance granted';
        await notificationService.createNotification(student._id, {
          title: 'Library Clearance Approved 📚',
          message: `Your Library status has been updated to Cleared (${notifMsg}).`,
          type: 'success',
          link: '/dashboard/clearance',
        });
      }
    } catch (notifErr) {
      logger.warn('Failed to send notification to student for library update', { error: notifErr.message });
    }

    logger.info('Student library status updated by Library Section', {
      studentId,
      status,
      reason,
      updatedByUserId,
    });

    return {
      studentId,
      library_status: sc.fees_status,
      fees_status: sc.fees_status,
      reason: sc.reason,
      remark_text: sc.remark_text,
      updated_by: { id: updatedByUserId, name: updaterName },
      updated_at: sc.updated_at,
      auditTrail: sc.auditTrail,
    };
  },

  /**
   * Bulk updates student library status to paid / cleared
   */
  async bulkUpdateStudentLibraryStatus(studentIdentifiers, status = 'paid', remarkText = 'Bulk library clearance granted', updatedByUserId) {
    if (!Array.isArray(studentIdentifiers) || studentIdentifiers.length === 0) {
      throw AppError.badRequest('studentIdentifiers array is required');
    }

    // Find students by ID, Enrollment Number, or Email
    const validObjectIds = studentIdentifiers.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const stringIdentifiers = studentIdentifiers.filter((id) => typeof id === 'string').map((s) => s.trim());

    const orConditions = [];
    if (validObjectIds.length > 0) {
      orConditions.push({ _id: { $in: validObjectIds } });
    }
    if (stringIdentifiers.length > 0) {
      const regexes = stringIdentifiers.map((e) => new RegExp(`^${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
      orConditions.push({ enrollmentNo: { $in: regexes } });
      orConditions.push({ email: { $in: regexes } });
    }

    const students = orConditions.length > 0 ? await User.find({ $or: orConditions }) : [];

    if (students.length === 0) {
      logger.info('No matching database students found for bulk update; returning 0 count.');
      return {
        count: 0,
        updatedStudents: [],
        message: 'No matching database students found for bulk update',
      };
    }

    const updatedResults = [];
    for (const student of students) {
      try {
        const res = await this.updateStudentLibraryStatus(
          student._id,
          { status, reason: undefined, remark_text: remarkText },
          updatedByUserId
        );
        updatedResults.push(res);
      } catch (err) {
        logger.warn(`Failed bulk library update for student ${student._id}`, { error: err.message });
      }
    }

    return {
      count: updatedResults.length,
      updatedStudents: updatedResults,
    };
  },
};

module.exports = librarySectionService;
