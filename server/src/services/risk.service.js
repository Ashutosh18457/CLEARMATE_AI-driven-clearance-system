const Submission = require('../models/Submission');
const SubmissionItem = require('../models/SubmissionItem');
const ClearanceRequest = require('../models/ClearanceRequest');
const ItemClearance = require('../models/ItemClearance');
const User = require('../models/User');
const Semester = require('../models/Semester');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const riskService = {
  /**
   * Analyzes students in a semester and assigns risk levels based on:
   * 1. Submission completion rate
   * 2. Overdue submissions count
   * 3. Rejected submissions count
   * 4. Clearance item rejection count
   * 5. Whether clearance has been initiated
   *
   * Risk Levels:
   * - HIGH (score >= 70): Likely to miss clearance deadline
   * - MEDIUM (score 40-69): Needs attention
   * - LOW (score < 40): On track
   */
  async getAtRiskStudents(semesterId, filters = {}) {
    const semester = await Semester.findById(semesterId);
    if (!semester) throw AppError.notFound('Semester not found');

    // Get all active students for this semester
    const studentQuery = {
      role: 'student',
      programId: semester.programId,
      currentSemester: semester.semNumber,
      isActive: true,
    };

    const students = await User.find(studentQuery)
      .select('name email enrollmentNo section batchId')
      .lean();

    if (students.length === 0) return { students: [], summary: { high: 0, medium: 0, low: 0 } };

    const studentIds = students.map((s) => s._id);

    // Get all submission items for this semester
    const submissionItems = await SubmissionItem.find({ semesterId }).lean();
    const itemIds = submissionItems.map((si) => si._id);
    const now = new Date();
    const overdueItemIds = submissionItems
      .filter((si) => new Date(si.deadline) < now)
      .map((si) => si._id);

    // Get all submissions for these students
    const submissions = await Submission.find({
      studentId: { $in: studentIds },
      submissionItemId: { $in: itemIds },
    }).lean();

    // Build per-student submission map
    const studentSubmissionMap = {};
    for (const sub of submissions) {
      const sid = sub.studentId.toString();
      if (!studentSubmissionMap[sid]) studentSubmissionMap[sid] = [];
      studentSubmissionMap[sid].push(sub);
    }

    // Get clearance requests
    const clearanceRequests = await ClearanceRequest.find({
      studentId: { $in: studentIds },
      semesterId,
    }).lean();

    const clearanceMap = {};
    for (const cr of clearanceRequests) {
      clearanceMap[cr.studentId.toString()] = cr;
    }

    // Get item clearance rejections
    const crIds = clearanceRequests.map((cr) => cr._id);
    const itemClearances = await ItemClearance.find({
      clearanceRequestId: { $in: crIds },
      status: 'rejected',
    }).lean();

    const rejectionMap = {};
    for (const ic of itemClearances) {
      const sid = ic.studentId.toString();
      rejectionMap[sid] = (rejectionMap[sid] || 0) + 1;
    }

    // Calculate risk score per student
    const totalItems = submissionItems.length;
    const riskResults = students.map((student) => {
      const sid = student._id.toString();
      const subs = studentSubmissionMap[sid] || [];
      const cr = clearanceMap[sid];

      // Factor 1: Submission completion rate (0-30 points)
      const verifiedCount = subs.filter((s) => s.status === 'verified').length;
      const completionRate = totalItems > 0 ? verifiedCount / totalItems : 0;
      const completionScore = Math.round((1 - completionRate) * 30);

      // Factor 2: Overdue submissions (0-25 points)
      const overdueCount = overdueItemIds.filter((itemId) => {
        const sub = subs.find((s) => s.submissionItemId.toString() === itemId.toString());
        return !sub || sub.status !== 'verified';
      }).length;
      const overdueScore = Math.min(overdueCount * 5, 25);

      // Factor 3: Rejected submissions (0-15 points)
      const rejectedSubs = subs.filter((s) => s.status === 'rejected').length;
      const rejectedScore = Math.min(rejectedSubs * 5, 15);

      // Factor 4: Clearance item rejections (0-15 points)
      const clearanceRejections = rejectionMap[sid] || 0;
      const clearanceRejScore = Math.min(clearanceRejections * 5, 15);

      // Factor 5: Clearance not initiated (0-15 points)
      const notInitiatedScore = !cr ? 15 : (cr.status === 'rejected' ? 10 : 0);

      const totalScore = completionScore + overdueScore + rejectedScore + clearanceRejScore + notInitiatedScore;

      let riskLevel;
      if (totalScore >= 70) riskLevel = 'high';
      else if (totalScore >= 40) riskLevel = 'medium';
      else riskLevel = 'low';

      return {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          enrollmentNo: student.enrollmentNo,
          section: student.section,
        },
        riskScore: totalScore,
        riskLevel,
        factors: {
          completionRate: Math.round(completionRate * 100),
          overdueSubmissions: overdueCount,
          rejectedSubmissions: rejectedSubs,
          clearanceRejections,
          clearanceInitiated: !!cr,
          clearanceStatus: cr?.status || 'not_initiated',
        },
      };
    });

    // Sort by risk score descending (highest risk first)
    riskResults.sort((a, b) => b.riskScore - a.riskScore);

    // Apply risk level filter if specified
    let filtered = riskResults;
    if (filters.riskLevel) {
      filtered = riskResults.filter((r) => r.riskLevel === filters.riskLevel);
    }

    // Pagination
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 50;
    const skip = (page - 1) * limit;
    const paginated = filtered.slice(skip, skip + limit);

    // Summary
    const summary = {
      total: students.length,
      high: riskResults.filter((r) => r.riskLevel === 'high').length,
      medium: riskResults.filter((r) => r.riskLevel === 'medium').length,
      low: riskResults.filter((r) => r.riskLevel === 'low').length,
    };

    return {
      students: paginated,
      summary,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit),
      },
    };
  },
};

module.exports = riskService;
