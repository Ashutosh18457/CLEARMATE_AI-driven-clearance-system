const mongoose = require('mongoose');
const SectionClearance = require('../models/SectionClearance');
const ClearanceRequest = require('../models/ClearanceRequest');
const User = require('../models/User');
const Program = require('../models/Program');
const Semester = require('../models/Semester');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const accountSectionService = {
  /**
   * Gets list of active branches (programs) and semesters for filtering
   */
  async getBranchesAndSemesters() {
    const programs = await Program.find({ isActive: true }).select('name code branch degree department totalSemesters');
    const semesters = await Semester.find({ isActive: true }).select('name semNumber academicYear programId type');
    return { programs, semesters };
  },

  /**
   * Gets list of students with fee clearance status, searchable & paginated.
   * Supports filtering by branch (programId) and semester (currentSemester).
   */
  async getStudentsFeeStatus(queryParams = {}) {
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

    // Fetch accounts SectionClearances for these students
    const sectionClearances = await SectionClearance.find({
      studentId: { $in: studentIds },
      department: 'accounts',
    }).populate('updated_by', 'name email');

    const clearanceMap = new Map();
    sectionClearances.forEach((sc) => {
      clearanceMap.set(sc.studentId.toString(), sc);
    });

    let results = students.map((student) => {
      const sc = clearanceMap.get(student._id.toString());
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
        fees_status: sc ? sc.fees_status || (sc.status === 'approved' ? 'paid' : 'not_paid') : 'not_paid',
        reason: sc ? sc.reason || null : null,
        remark_text: sc ? sc.remark_text || sc.remarks || '' : '',
        updated_by: sc && sc.updated_by ? { id: sc.updated_by._id, name: sc.updated_by.name } : null,
        updated_at: sc ? sc.updated_at || sc.updatedAt : null,
        auditTrail: sc && sc.auditTrail ? sc.auditTrail : [],
      };
    });

    // Apply status filter if requested
    if (statusFilter === 'paid' || statusFilter === 'not_paid') {
      results = results.filter((r) => r.fees_status === statusFilter);
    }

    return {
      students: results,
      pagination: {
        page,
        limit,
        total: totalStudents,
        pages: Math.ceil(totalStudents / limit),
      },
    };
  },

  /**
   * Gets single student fee clearance details and audit history.
   */
  async getStudentFeeDetail(studentId) {
    const student = await User.findById(studentId)
      .select('name email enrollmentNo section currentSemester programId')
      .populate('programId', 'name code');

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    let sectionClearance = await SectionClearance.findOne({
      studentId,
      department: 'accounts',
    }).populate('updated_by', 'name email');

    return {
      student: {
        id: student._id,
        _id: student._id,
        name: student.name,
        email: student.email,
        enrollmentNo: student.enrollmentNo || 'N/A',
        section: student.section || 'N/A',
        currentSemester: student.currentSemester,
        program: student.programId ? student.programId.name : 'N/A',
      },
      fees_status: sectionClearance ? sectionClearance.fees_status || (sectionClearance.status === 'approved' ? 'paid' : 'not_paid') : 'not_paid',
      reason: sectionClearance ? sectionClearance.reason || null : null,
      remark_text: sectionClearance ? sectionClearance.remark_text || sectionClearance.remarks || '' : '',
      updated_by: sectionClearance && sectionClearance.updated_by ? { id: sectionClearance.updated_by._id, name: sectionClearance.updated_by.name } : null,
      updated_at: sectionClearance ? sectionClearance.updated_at || sectionClearance.updatedAt : null,
      auditTrail: sectionClearance && sectionClearance.auditTrail ? sectionClearance.auditTrail : [],
    };
  },

  /**
   * Updates a student's fee clearance status and appends to audit trail.
   */
  async updateStudentFees(studentId, payload, updatedByUserId) {
    const { status, reason, remark_text } = payload;

    if (!['paid', 'not_paid'].includes(status)) {
      throw AppError.badRequest('Invalid status. Must be "paid" or "not_paid".');
    }

    if (status === 'not_paid') {
      if (!['fees_pending', 'remark'].includes(reason)) {
        throw AppError.badRequest('Reason is required when status is "not_paid". Must be "fees_pending" or "remark".');
      }
      if (reason === 'remark' && (!remark_text || !remark_text.trim())) {
        throw AppError.badRequest('Remark text is required when reason is "remark".');
      }
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw AppError.notFound('Student not found');
    }

    const updatedByUser = await User.findById(updatedByUserId);
    const updatedByName = updatedByUser ? updatedByUser.name : 'Account Section Admin';

    // Find active clearance request for student if any
    const clearanceRequest = await ClearanceRequest.findOne({ studentId })
      .sort({ createdAt: -1 });

    let sectionClearance = await SectionClearance.findOne({
      studentId,
      department: 'accounts',
    });

    if (!sectionClearance) {
      sectionClearance = new SectionClearance({
        clearanceRequestId: clearanceRequest ? clearanceRequest._id : undefined,
        studentId,
        department: 'accounts',
        auditTrail: [],
      });
    }

    const finalRemark = status === 'paid' ? 'Fees cleared' : reason === 'remark' ? remark_text.trim() : 'Fees pending';

    // Update fee clearance fields
    sectionClearance.fees_status = status;
    sectionClearance.reason = status === 'paid' ? null : reason;
    sectionClearance.remark_text = status === 'paid' ? '' : finalRemark;
    sectionClearance.remarks = finalRemark;
    sectionClearance.updated_by = updatedByUserId;
    sectionClearance.reviewerId = updatedByUserId;
    sectionClearance.updated_at = new Date();
    sectionClearance.reviewedAt = new Date();

    // Map fees_status to overall SectionClearance status
    if (status === 'paid') {
      sectionClearance.status = 'approved';
    } else {
      sectionClearance.status = 'pending';
    }

    // Append to audit trail
    if (!sectionClearance.auditTrail) {
      sectionClearance.auditTrail = [];
    }

    sectionClearance.auditTrail.push({
      status,
      reason: status === 'paid' ? null : reason,
      remark_text: finalRemark,
      changed_by: updatedByUserId,
      changed_by_name: updatedByName,
      changed_at: new Date(),
    });

    await sectionClearance.save();

    logger.info('Student fee status updated by Account Section', {
      studentId,
      status,
      reason,
      updatedByUserId,
    });

    return {
      studentId,
      fees_status: sectionClearance.fees_status,
      reason: sectionClearance.reason,
      remark_text: sectionClearance.remark_text,
      updated_by: { id: updatedByUserId, name: updatedByName },
      updated_at: sectionClearance.updated_at,
      auditTrail: sectionClearance.auditTrail,
    };
  },
};

module.exports = accountSectionService;
