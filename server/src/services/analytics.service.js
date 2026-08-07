const ClearanceRequest = require('../models/ClearanceRequest');
const ItemClearance = require('../models/ItemClearance');
const SectionClearance = require('../models/SectionClearance');
const Submission = require('../models/Submission');
const SubmissionItem = require('../models/SubmissionItem');
const User = require('../models/User');
const Semester = require('../models/Semester');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const analyticsService = {
  // ══════════════════════════════════════════════
  // CLEARANCE OVERVIEW
  // ══════════════════════════════════════════════

  /**
   * Returns clearance status counts for a semester.
   * { total, initiated, items_review, sections_review, ci_review, hod_review, completed, rejected }
   */
  async getClearanceOverview(semesterId) {
    const pipeline = [
      { $match: { semesterId: new mongoose.Types.ObjectId(semesterId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await ClearanceRequest.aggregate(pipeline);

    // Build a clean response with all statuses defaulting to 0
    const statuses = ['initiated', 'items_review', 'sections_review', 'ci_review', 'hod_review', 'completed', 'rejected'];
    const overview = { total: 0 };
    for (const s of statuses) {
      overview[s] = 0;
    }

    for (const r of results) {
      overview[r._id] = r.count;
      overview.total += r.count;
    }

    // Compute completion rate
    overview.completionRate = overview.total > 0
      ? Math.round((overview.completed / overview.total) * 100 * 10) / 10
      : 0;

    // In-progress = total - completed - rejected
    overview.inProgress = overview.total - overview.completed - overview.rejected;

    return overview;
  },

  // ══════════════════════════════════════════════
  // STAGE DISTRIBUTION
  // ══════════════════════════════════════════════

  /**
   * Returns how many active clearances are at each stage.
   * Useful for identifying bottlenecks.
   */
  async getStageDistribution(semesterId) {
    const pipeline = [
      {
        $match: {
          semesterId: new mongoose.Types.ObjectId(semesterId),
          status: { $nin: ['completed', 'rejected'] },
        },
      },
      {
        $group: {
          _id: '$currentStage',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ];

    const results = await ClearanceRequest.aggregate(pipeline);

    const stageNames = {
      items: 'Items Review (Teachers)',
      sections: 'Sections Review (Departments)',
      class_incharge: 'Class Incharge Review',
      hod: 'HOD Final Review',
    };

    return results.map((r) => ({
      stage: r._id,
      label: stageNames[r._id] || r._id,
      count: r.count,
    }));
  },

  // ══════════════════════════════════════════════
  // DEPARTMENT STATS
  // ══════════════════════════════════════════════

  /**
   * Returns approval/rejection/pending rates per department (Library, Accounts, Bus, Student Section).
   */
  async getDepartmentStats(semesterId) {
    // Get all clearance request IDs for this semester
    const requestIds = await ClearanceRequest.find({ semesterId })
      .select('_id')
      .lean();

    const requestIdList = requestIds.map((r) => r._id);

    if (requestIdList.length === 0) {
      return [];
    }

    const pipeline = [
      { $match: { clearanceRequestId: { $in: requestIdList } } },
      {
        $group: {
          _id: { department: '$department', status: '$status' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.department',
          statuses: {
            $push: { status: '$_id.status', count: '$count' },
          },
          total: { $sum: '$count' },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const results = await SectionClearance.aggregate(pipeline);

    const departmentLabels = {
      library: 'Library',
      accounts: 'Accounts',
      bus: 'Bus/Transport',
      student_section: 'Student Section',
    };

    return results.map((r) => {
      const statusMap = { pending: 0, approved: 0, rejected: 0 };
      for (const s of r.statuses) {
        statusMap[s.status] = s.count;
      }

      return {
        department: r._id,
        label: departmentLabels[r._id] || r._id,
        total: r.total,
        approved: statusMap.approved,
        rejected: statusMap.rejected,
        pending: statusMap.pending,
        approvalRate: r.total > 0
          ? Math.round((statusMap.approved / r.total) * 100 * 10) / 10
          : 0,
      };
    });
  },

  // ══════════════════════════════════════════════
  // SUBMISSION STATS
  // ══════════════════════════════════════════════

  /**
   * Returns submission verification rates and overdue counts for a semester.
   */
  async getSubmissionStats(semesterId) {
    // Get all submission items for this semester
    const submissionItems = await SubmissionItem.find({ semesterId }).select('_id deadline').lean();
    const itemIds = submissionItems.map((si) => si._id);

    if (itemIds.length === 0) {
      return {
        totalItems: 0,
        totalSubmissions: 0,
        statusBreakdown: { pending: 0, submitted: 0, verified: 0, rejected: 0 },
        verificationRate: 0,
        overdueItems: 0,
      };
    }

    // Aggregate submission statuses
    const pipeline = [
      { $match: { submissionItemId: { $in: itemIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await Submission.aggregate(pipeline);

    const statusBreakdown = { pending: 0, submitted: 0, verified: 0, rejected: 0 };
    let totalSubmissions = 0;

    for (const r of results) {
      statusBreakdown[r._id] = r.count;
      totalSubmissions += r.count;
    }

    // Count overdue items (past deadline, no verified submission)
    const now = new Date();
    const overdueItemIds = submissionItems
      .filter((si) => new Date(si.deadline) < now)
      .map((si) => si._id);

    let overdueCount = 0;
    if (overdueItemIds.length > 0) {
      // Count students who have overdue items without verified submissions
      const verifiedForOverdue = await Submission.countDocuments({
        submissionItemId: { $in: overdueItemIds },
        status: 'verified',
      });
      // Rough metric: overdue items * expected students - verified
      overdueCount = overdueItemIds.length; // Number of overdue submission items
    }

    return {
      totalItems: submissionItems.length,
      totalSubmissions,
      statusBreakdown,
      verificationRate: totalSubmissions > 0
        ? Math.round((statusBreakdown.verified / totalSubmissions) * 100 * 10) / 10
        : 0,
      overdueItems: overdueCount,
    };
  },

  // ══════════════════════════════════════════════
  // STUDENT PROGRESS
  // ══════════════════════════════════════════════

  /**
   * Returns per-student clearance progress for a semester.
   * Includes clearance status, item clearance progress %, and section clearance progress %.
   */
  async getStudentProgress(semesterId, filters = {}) {
    const semester = await Semester.findById(semesterId);
    if (!semester) throw AppError.notFound('Semester not found');

    // Build student query
    const studentQuery = {
      role: 'student',
      programId: semester.programId,
      currentSemester: semester.semNumber,
      isActive: true,
    };
    if (filters.section) studentQuery.section = filters.section;

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      User.find(studentQuery)
        .select('name email enrollmentNo section')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(studentQuery),
    ]);

    // Get clearance requests for these students
    const studentIds = students.map((s) => s._id);
    const clearanceRequests = await ClearanceRequest.find({
      studentId: { $in: studentIds },
      semesterId,
    }).lean();

    const requestMap = {};
    for (const cr of clearanceRequests) {
      requestMap[cr.studentId.toString()] = cr;
    }

    // Get item clearance progress for each student
    const requestIds = clearanceRequests.map((cr) => cr._id);

    const itemProgress = await ItemClearance.aggregate([
      { $match: { clearanceRequestId: { $in: requestIds } } },
      {
        $group: {
          _id: '$studentId',
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
        },
      },
    ]);

    const itemProgressMap = {};
    for (const ip of itemProgress) {
      itemProgressMap[ip._id.toString()] = ip;
    }

    // Build response
    const progress = students.map((student) => {
      const sid = student._id.toString();
      const cr = requestMap[sid];
      const ip = itemProgressMap[sid] || { total: 0, approved: 0, rejected: 0 };

      return {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          enrollmentNo: student.enrollmentNo,
          section: student.section,
        },
        clearance: cr
          ? {
              status: cr.status,
              currentStage: cr.currentStage,
              initiatedAt: cr.initiatedAt,
              completedAt: cr.completedAt,
            }
          : null,
        itemProgress: {
          total: ip.total,
          approved: ip.approved,
          rejected: ip.rejected,
          pending: ip.total - ip.approved - ip.rejected,
          percentage: ip.total > 0
            ? Math.round((ip.approved / ip.total) * 100)
            : 0,
        },
      };
    });

    return {
      progress,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  },
};

module.exports = analyticsService;
