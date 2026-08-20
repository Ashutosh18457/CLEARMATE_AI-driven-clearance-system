const mongoose = require('mongoose');
const SectionClearance = require('../models/SectionClearance');
const ClearanceRequest = require('../models/ClearanceRequest');
const User = require('../models/User');
const Program = require('../models/Program');
const Semester = require('../models/Semester');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const notificationService = require('./notification.service');

const busSectionService = {
  /**
   * Gets list of active branches (programs) and semesters for filtering
   */
  async getBranchesAndSemesters() {
    const programs = await Program.find({ isActive: true }).select('name code branch degree department totalSemesters');
    const semesters = await Semester.find({ isActive: true }).select('name semNumber academicYear programId type');
    return { programs, semesters };
  },

  /**
   * Gets list of students with bus fee clearance status, searchable & paginated.
   * Supports filtering by status, branch (programId), and semester (currentSemester).
   */
  async getStudentsBusFeeStatus(queryParams = {}) {
    const page = parseInt(queryParams.page, 10) || 1;
    const limit = parseInt(queryParams.limit, 10) || 50;
    const skip = (page - 1) * limit;
    const search = queryParams.search ? queryParams.search.trim() : '';
    const statusFilter = queryParams.status; // 'paid' | 'not_paid'
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

    // Fetch bus SectionClearances for these students
    const sectionClearances = await SectionClearance.find({
      studentId: { $in: studentIds },
      department: 'bus',
    }).populate('updated_by', 'name email');

    const clearanceMap = new Map();
    sectionClearances.forEach((sc) => {
      clearanceMap.set(sc.studentId.toString(), sc);
    });

    let results = students.map((student) => {
      const sc = clearanceMap.get(student._id.toString());
      const fees_status = sc ? (sc.bus_fees_status || sc.fees_status || (sc.status === 'approved' ? 'paid' : 'not_paid')) : 'not_paid';
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
        bus_fees_status: fees_status,
        fees_status: fees_status,
        reason: sc ? sc.reason || null : null,
        remark_text: sc ? sc.remark_text || sc.remarks || '' : '',
        updated_by: sc && sc.updated_by ? { id: sc.updated_by._id, name: sc.updated_by.name } : null,
        updated_at: sc ? sc.updated_at || sc.updatedAt : null,
        auditTrail: sc && sc.auditTrail ? sc.auditTrail : [],
      };
    });

    // Apply status filter if requested
    if (statusFilter === 'paid' || statusFilter === 'not_paid') {
      results = results.filter((r) => r.bus_fees_status === statusFilter);
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
   * Gets single student bus fee detail + audit trail
   */
  async getStudentBusFeeDetail(studentId) {
    const student = await User.findOne({ _id: studentId }).populate('programId', 'name code degree department');
    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const sc = await SectionClearance.findOne({
      studentId: student._id,
      department: 'bus',
    }).populate('updated_by', 'name email');

    const fees_status = sc ? (sc.bus_fees_status || sc.fees_status || (sc.status === 'approved' ? 'paid' : 'not_paid')) : 'not_paid';

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
      bus_fees_status: fees_status,
      fees_status: fees_status,
      reason: sc ? sc.reason || null : null,
      remark_text: sc ? sc.remark_text || sc.remarks || '' : '',
      updated_by: sc && sc.updated_by ? { id: sc.updated_by._id, name: sc.updated_by.name } : null,
      updated_at: sc ? sc.updated_at || sc.updatedAt : null,
      auditTrail: sc && sc.auditTrail ? sc.auditTrail : [],
    };
  },

  /**
   * Updates student bus fee status and logs audit trail.
   */
  async updateStudentBusFees(studentId, updateData, updatedByUserId) {
    const { status, reason, remark_text } = updateData; // status: 'paid' | 'not_paid'

    if (status !== 'paid' && status !== 'not_paid') {
      throw AppError.badRequest('Status must be paid or not_paid');
    }

    const student = await User.findOne({ _id: studentId });
    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const updater = await User.findById(updatedByUserId);
    const updaterName = updater ? updater.name : 'Bus Section Admin';

    // Find active ClearanceRequest for student if one exists
    const activeRequest = await ClearanceRequest.findOne({
      studentId: student._id,
      status: { $nin: ['fully_cleared', 'rejected'] },
    });

    let sc = await SectionClearance.findOne({
      studentId: student._id,
      department: 'bus',
    });

    if (!sc) {
      sc = new SectionClearance({
        clearanceRequestId: activeRequest ? activeRequest._id : undefined,
        studentId: student._id,
        department: 'bus',
      });
    }

    // Set bus fee clearance status and department approval status
    sc.fees_status = status;
    sc.bus_fees_status = status;
    sc.status = status === 'paid' ? 'approved' : 'rejected';
    sc.reviewerId = updatedByUserId;
    sc.updated_by = updatedByUserId;
    sc.updated_at = new Date();
    sc.reviewedAt = new Date();

    if (status === 'paid') {
      sc.reason = reason || undefined;
      sc.remark_text = remark_text && remark_text.trim() ? remark_text.trim() : 'Bus fees cleared';
      sc.remarks = sc.remark_text;
    } else {
      sc.reason = reason || 'fees_pending';
      sc.remark_text = reason === 'remark' ? (remark_text || 'Bus fees pending') : 'Bus fees pending';
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

    // If an active ClearanceRequest exists, update department clearance summary and check advancement
    if (activeRequest) {
      if (activeRequest.sectionClearances) {
        let secSummary = activeRequest.sectionClearances.find((s) => s.department === 'bus');
        if (secSummary) {
          secSummary.status = sc.status;
          secSummary.reviewerId = updatedByUserId;
          secSummary.reviewedAt = new Date();
          secSummary.remarks = sc.remarks;
          await activeRequest.save();
        }
      }

      if (status === 'paid') {
        const clearanceService = require('./clearance.service');
        await clearanceService._checkAndAdvanceFromSections(activeRequest._id);
      }
    }

    // Send Notification to student
    try {
      if (status === 'not_paid') {
        const notifMsg = sc.remark_text || 'Bus fees pending. Please resolve with Bus Section.';
        await notificationService.createNotification(student._id, {
          title: 'Bus Transport Fee Remark 🚌',
          message: `Bus Section Remark: ${notifMsg}`,
          type: 'warning',
          link: '/dashboard/clearance',
        });
      } else if (status === 'paid') {
        const notifMsg = sc.remark_text || 'Bus fees cleared';
        await notificationService.createNotification(student._id, {
          title: 'Bus Transport Fee Cleared 🚌',
          message: `Your Bus Fee status has been updated to Paid (${notifMsg}).`,
          type: 'success',
          link: '/dashboard/clearance',
        });
      }
    } catch (notifErr) {
      logger.warn('Failed to send notification to student for bus fee update', { error: notifErr.message });
    }

    logger.info('Student bus fee status updated by Bus Section', {
      studentId,
      status,
      reason,
      updatedByUserId,
    });

    return {
      studentId,
      bus_fees_status: sc.fees_status,
      fees_status: sc.fees_status,
      reason: sc.reason,
      remark_text: sc.remark_text,
      updated_by: { id: updatedByUserId, name: updaterName },
      updated_at: sc.updated_at,
      auditTrail: sc.auditTrail,
    };
  },
};

module.exports = busSectionService;
