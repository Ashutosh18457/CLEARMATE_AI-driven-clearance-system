const mongoose = require('mongoose');
const SectionClearance = require('../models/SectionClearance');
const ClearanceRequest = require('../models/ClearanceRequest');
const User = require('../models/User');
const Program = require('../models/Program');
const Semester = require('../models/Semester');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const notificationService = require('./notification.service');

const disciplinarySectionService = {
  /**
   * Gets list of active branches (programs) and semesters for filtering
   */
  async getBranchesAndSemesters() {
    const programs = await Program.find({ isActive: true }).select('name code branch degree department totalSemesters');
    const semesters = await Semester.find({ isActive: true }).select('name semNumber academicYear programId type');
    return { programs, semesters };
  },

  /**
   * Gets list of students with disciplinary clearance status, searchable & paginated.
   * Supports filtering by status, branch (programId), and semester (currentSemester).
   */
  async getStudentsDisciplinaryStatus(queryParams = {}) {
    const page = parseInt(queryParams.page, 10) || 1;
    const limit = parseInt(queryParams.limit, 10) || 50;
    const skip = (page - 1) * limit;
    const search = queryParams.search ? queryParams.search.trim() : '';
    const statusFilter = queryParams.status; // 'cleared' | 'not_cleared' | 'paid' | 'not_paid'
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

    // Fetch disciplinary SectionClearances for these students
    const sectionClearances = await SectionClearance.find({
      studentId: { $in: studentIds },
      department: 'disciplinary',
    }).populate('updated_by', 'name email');

    const clearanceMap = new Map();
    sectionClearances.forEach((sc) => {
      clearanceMap.set(sc.studentId.toString(), sc);
    });

    let results = students.map((student) => {
      const sc = clearanceMap.get(student._id.toString());
      const disp_status = sc
        ? sc.disciplinary_status || sc.fees_status || (sc.status === 'approved' ? 'cleared' : 'not_cleared')
        : 'not_cleared';
      const normalizedStatus = disp_status === 'approved' || disp_status === 'paid' || disp_status === 'cleared' ? 'cleared' : 'not_cleared';

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
        disciplinary_status: normalizedStatus,
        fees_status: normalizedStatus === 'cleared' ? 'paid' : 'not_paid',
        reason: sc ? sc.reason || null : null,
        remark_text: sc ? sc.remark_text || sc.remarks || '' : '',
        updated_by: sc && sc.updated_by ? { name: sc.updated_by.name, email: sc.updated_by.email } : null,
        updated_at: sc ? sc.updated_at || sc.reviewedAt || null : null,
        sectionClearanceId: sc ? sc._id : null,
        auditTrail: sc && sc.remarksHistory ? sc.remarksHistory : [],
      };
    });

    if (statusFilter && statusFilter !== 'all') {
      const targetStatus = (statusFilter === 'cleared' || statusFilter === 'paid') ? 'cleared' : 'not_cleared';
      results = results.filter((r) => r.disciplinary_status === targetStatus);
    }

    return {
      students: results,
      pagination: {
        total: results.length,
        totalStudents,
        page,
        limit,
        totalPages: Math.ceil(totalStudents / limit),
      },
    };
  },

  /**
   * Gets details for a single student's disciplinary status
   */
  async getStudentDisciplinaryDetail(studentId) {
    const student = await User.findById(studentId)
      .select('name email enrollmentNo section currentSemester programId')
      .populate('programId', 'name code degree department');

    if (!student || student.role !== 'student') {
      throw AppError.notFound('Student not found');
    }

    const sc = await SectionClearance.findOne({
      studentId,
      department: 'disciplinary',
    }).populate('updated_by', 'name email');

    const disp_status = sc
      ? sc.disciplinary_status || sc.fees_status || (sc.status === 'approved' ? 'cleared' : 'not_cleared')
      : 'not_cleared';
    const normalizedStatus = disp_status === 'approved' || disp_status === 'paid' || disp_status === 'cleared' ? 'cleared' : 'not_cleared';

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
      disciplinary_status: normalizedStatus,
      fees_status: normalizedStatus === 'cleared' ? 'paid' : 'not_paid',
      reason: sc ? sc.reason || null : null,
      remark_text: sc ? sc.remark_text || sc.remarks || '' : '',
      updated_by: sc && sc.updated_by ? { name: sc.updated_by.name, email: sc.updated_by.email } : null,
      updated_at: sc ? sc.updated_at || sc.reviewedAt || null : null,
      sectionClearanceId: sc ? sc._id : null,
      auditTrail: sc && sc.remarksHistory ? sc.remarksHistory : [],
    };
  },

  /**
   * Updates a single student's disciplinary clearance status
   */
  async updateDisciplinaryStatus(studentId, updateData, reviewerId) {
    const { disciplinary_status, fees_status, reason, remark_text } = updateData;

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw AppError.notFound('Student not found');
    }

    const reviewer = await User.findById(reviewerId);
    const reviewerName = reviewer ? reviewer.name : 'Disciplinary Section Admin';

    let rawStatus = disciplinary_status || fees_status;
    const isCleared = rawStatus === 'cleared' || rawStatus === 'paid' || rawStatus === 'approved';
    const finalStatus = isCleared ? 'cleared' : 'not_cleared';
    const clearanceStatus = isCleared ? 'approved' : 'rejected';

    let sc = await SectionClearance.findOne({
      studentId,
      department: 'disciplinary',
    });

    if (!sc) {
      // Find active clearance request if exists
      let cr = await ClearanceRequest.findOne({ studentId }).sort({ createdAt: -1 });

      sc = new SectionClearance({
        studentId,
        clearanceRequestId: cr ? cr._id : undefined,
        department: 'disciplinary',
        status: clearanceStatus,
        fees_status: isCleared ? 'paid' : 'not_paid',
        disciplinary_status: finalStatus,
        reason: isCleared ? null : (reason || 'fine_pending'),
        remark_text: isCleared ? (remark_text || 'Disciplinary clearance granted. Conduct NOC issued.') : (remark_text || 'Disciplinary action/penalty pending'),
        remarks: remark_text || '',
        reviewerId: reviewerId,
        updated_by: reviewerId,
        updated_at: new Date(),
        reviewedAt: new Date(),
      });
    } else {
      sc.disciplinary_status = finalStatus;
      sc.fees_status = isCleared ? 'paid' : 'not_paid';
      sc.status = clearanceStatus;
      sc.reason = isCleared ? null : (reason || 'fine_pending');
      sc.remark_text = isCleared ? (remark_text || 'Disciplinary clearance granted. Conduct NOC issued.') : (remark_text || 'Disciplinary action/penalty pending');
      sc.remarks = remark_text || sc.remarks || '';
      sc.reviewerId = reviewerId;
      sc.updated_by = reviewerId;
      sc.updated_at = new Date();
      sc.reviewedAt = new Date();
    }

    if (!sc.remarksHistory) {
      sc.remarksHistory = [];
    }

    sc.remarksHistory.push({
      status: finalStatus,
      reason: isCleared ? null : (reason || 'fine_pending'),
      remark_text: sc.remark_text,
      changed_by_name: reviewerName,
      changed_at: new Date(),
    });

    await sc.save();

    // Check & advance overall clearance request if in sections_review stage
    if (sc.clearanceRequestId) {
      try {
        const clearanceService = require('./clearance.service');
        const allSections = await SectionClearance.find({ clearanceRequestId: sc.clearanceRequestId });
        const allApproved = allSections.length > 0 && allSections.every((sec) => sec.status === 'approved');

        if (allApproved) {
          const cr = await ClearanceRequest.findById(sc.clearanceRequestId);
          if (cr && cr.status === 'sections_review') {
            cr.status = 'ci_review';
            cr.timeline.push({
              stage: 'ci_review',
              status: 'approved',
              actorId: reviewerId,
              remarks: 'All section clearances (Library, Accounts, Bus, Disciplinary) approved.',
              timestamp: new Date(),
            });
            await cr.save();
          }
        }
      } catch (err) {
        logger.error('Error auto-advancing clearance request in Disciplinary service:', err);
      }
    }

    // Send notification to student
    try {
      if (isCleared) {
        await notificationService.createNotification(studentId, {
          title: 'Disciplinary Clearance Approved ⚖️',
          message: `Your Disciplinary status has been updated to Cleared. Remark: ${sc.remark_text || 'Disciplinary clearance granted.'}`,
          type: 'success',
          link: '/student/clearance',
        });
      } else {
        await notificationService.createNotification(studentId, {
          title: 'Disciplinary Clearance Action Pending ⚖️',
          message: `Disciplinary Section Remark: ${sc.remark_text || 'Disciplinary action/penalty pending.'}`,
          type: 'warning',
          link: '/student/clearance',
        });
      }
    } catch (nErr) {
      logger.warn('Failed to send disciplinary notification to student:', nErr);
    }

    return {
      student: {
        id: student._id,
        _id: student._id,
        name: student.name,
        email: student.email,
        enrollmentNo: student.enrollmentNo || 'N/A',
      },
      disciplinary_status: finalStatus,
      fees_status: isCleared ? 'paid' : 'not_paid',
      reason: sc.reason,
      remark_text: sc.remark_text,
      updated_by: { name: reviewerName },
      updated_at: sc.updated_at,
      auditTrail: sc.remarksHistory,
    };
  },

  /**
   * Bulk updates student disciplinary clearance status from CSV/array data
   */
  async bulkUpdateDisciplinaryStatus(updates, reviewerId) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw AppError.badRequest('Updates array must be non-empty');
    }

    const results = {
      successful: [],
      failed: [],
    };

    for (const update of updates) {
      try {
        const identifier = update.studentId || update.enrollmentNo || update.student_id || update.email;
        if (!identifier) {
          results.failed.push({ update, reason: 'Missing student identifier (enrollmentNo or ID)' });
          continue;
        }

        let student = null;
        if (mongoose.Types.ObjectId.isValid(identifier)) {
          student = await User.findById(identifier);
        }
        if (!student) {
          student = await User.findOne({
            $or: [
              { enrollmentNo: new RegExp(`^${identifier.trim()}$`, 'i') },
              { email: identifier.trim().toLowerCase() },
            ],
            role: 'student',
          });
        }

        if (!student) {
          results.failed.push({ update, reason: `Student matching "${identifier}" not found` });
          continue;
        }

        const res = await this.updateDisciplinaryStatus(
          student._id,
          {
            disciplinary_status: update.disciplinary_status || update.status || update.fees_status || 'cleared',
            reason: update.reason || null,
            remark_text: update.remark_text || update.remarks || 'Bulk disciplinary update processed',
          },
          reviewerId
        );

        results.successful.push({
          studentId: student._id,
          enrollmentNo: student.enrollmentNo,
          name: student.name,
          status: res.disciplinary_status,
        });
      } catch (err) {
        results.failed.push({ update, reason: err.message });
      }
    }

    return results;
  },

  /**
   * Resets or deletes a student's disciplinary section clearance record
   */
  async deleteStudentDisciplinaryRecord(studentId) {
    const res = await SectionClearance.deleteOne({ studentId, department: 'disciplinary' });
    return res;
  },
};

module.exports = disciplinarySectionService;
