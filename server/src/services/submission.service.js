const SubmissionItem = require('../models/SubmissionItem');
const Submission = require('../models/Submission');
const ClearanceItem = require('../models/ClearanceItem');
const Semester = require('../models/Semester');
const User = require('../models/User');
const Batch = require('../models/Batch');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const notificationService = require('./notification.service');

const submissionService = {
  // ══════════════════════════════════════════════
  // TEACHER OPERATIONS
  // ══════════════════════════════════════════════

  /**
   * Creates a submission item (assignment, lab record, etc.).
   * Verifies the teacher is actually assigned to the referenced ClearanceItem.
   */
  async createSubmissionItem(teacherId, data) {
    const clearanceItem = await ClearanceItem.findById(data.clearanceItemId);
    if (!clearanceItem) {
      throw AppError.notFound('Clearance item not found');
    }

    // Verify the teacher owns this clearance item
    const isOwner = this._isTeacherOwner(clearanceItem, teacherId);
    if (!isOwner) {
      throw AppError.forbidden('You are not assigned to this clearance item');
    }

    const submissionItem = await SubmissionItem.create({
      ...data,
      semesterId: clearanceItem.semesterId,
    });

    logger.info('SubmissionItem created', {
      itemId: submissionItem._id,
      teacherId,
      clearanceItemId: data.clearanceItemId,
    });

    return submissionItem;
  },

  /**
   * Gets all ClearanceItems assigned to this teacher with their semester and program details.
   */
  async getTeacherAssignedClearanceItems(teacherId) {
    const clearanceItems = await ClearanceItem.find()
      .populate({
        path: 'semesterId',
        select: 'semNumber academicYear programId',
        populate: {
          path: 'programId',
          select: 'name code degree durationYears totalSemesters',
        },
      })
      .sort({ title: 1 });

    const assigned = clearanceItems.filter((item) => this._isTeacherOwner(item, teacherId));
    return assigned;
  },

  /**
   * Gets all submission items created by a teacher for a given semester.
   * Groups them by their parent ClearanceItem for a cleaner UI.
   */
  async getSubmissionItemsByTeacher(teacherId, semesterId) {
    // Find all ClearanceItems this teacher is assigned to
    // If semesterId is provided, scope to that semester; otherwise find across all semesters
    const query = semesterId ? { semesterId } : {};
    const clearanceItems = await ClearanceItem.find(query);
    const ownedItemIds = clearanceItems
      .filter((item) => this._isTeacherOwner(item, teacherId))
      .map((item) => item._id);

    if (ownedItemIds.length === 0) {
      return [];
    }

    const submissionItems = await SubmissionItem.find({
      clearanceItemId: { $in: ownedItemIds },
    })
      .populate({
        path: 'clearanceItemId',
        select: 'title type subjectCode srNo semesterId',
        populate: {
          path: 'semesterId',
          select: 'semNumber academicYear programId',
          populate: {
            path: 'programId',
            select: 'name code degree',
          },
        },
      })
      .sort({ deadline: 1 });

    return submissionItems;
  },

  /**
   * Updates an existing submission item.
   * Allows modifying title, type, description, deadline, isRequired, and clearance item.
   */
  async updateSubmissionItem(teacherId, itemId, data) {
    const submissionItem = await SubmissionItem.findById(itemId).populate('clearanceItemId');
    if (!submissionItem) {
      throw AppError.notFound('Submission item not found');
    }

    // Verify current owner
    const currentClearanceItem = submissionItem.clearanceItemId;
    if (!currentClearanceItem || !this._isTeacherOwner(currentClearanceItem, teacherId)) {
      throw AppError.forbidden('You are not authorized to edit this submission item');
    }

    // If changing clearance item, verify ownership of new clearance item
    if (data.clearanceItemId && data.clearanceItemId.toString() !== currentClearanceItem._id.toString()) {
      const newClearanceItem = await ClearanceItem.findById(data.clearanceItemId);
      if (!newClearanceItem) {
        throw AppError.notFound('Target clearance item not found');
      }
      if (!this._isTeacherOwner(newClearanceItem, teacherId)) {
        throw AppError.forbidden('You are not authorized to assign this submission to the specified clearance item');
      }
      submissionItem.clearanceItemId = newClearanceItem._id;
      submissionItem.semesterId = newClearanceItem.semesterId;
    }

    if (data.title !== undefined) submissionItem.title = data.title;
    if (data.type !== undefined) submissionItem.type = data.type;
    if (data.description !== undefined) submissionItem.description = data.description;
    if (data.deadline !== undefined) submissionItem.deadline = data.deadline;
    if (data.isRequired !== undefined) submissionItem.isRequired = data.isRequired;

    await submissionItem.save();

    logger.info('SubmissionItem updated', {
      itemId,
      teacherId,
      updates: Object.keys(data),
    });

    const updated = await SubmissionItem.findById(itemId).populate({
      path: 'clearanceItemId',
      select: 'title type subjectCode srNo semesterId',
      populate: {
        path: 'semesterId',
        select: 'semNumber academicYear programId',
        populate: {
          path: 'programId',
          select: 'name code degree',
        },
      },
    });

    return updated;
  },

  /**
   * Deletes a submission item and removes all associated student submissions.
   */
  async deleteSubmissionItem(teacherId, itemId) {
    const submissionItem = await SubmissionItem.findById(itemId).populate('clearanceItemId');
    if (!submissionItem) {
      throw AppError.notFound('Submission item not found');
    }

    // Verify teacher owner
    const clearanceItem = submissionItem.clearanceItemId;
    if (!clearanceItem || !this._isTeacherOwner(clearanceItem, teacherId)) {
      throw AppError.forbidden('You are not authorized to delete this submission item');
    }

    // Delete associated student submissions
    const deletedSubmissions = await Submission.deleteMany({ submissionItemId: itemId });

    // Delete submission item
    await SubmissionItem.findByIdAndDelete(itemId);

    logger.info('SubmissionItem deleted', {
      itemId,
      teacherId,
      deletedSubmissionsCount: deletedSubmissions.deletedCount,
    });

    return {
      message: 'Submission item and associated student submissions deleted successfully',
      deletedSubmissionsCount: deletedSubmissions.deletedCount,
    };
  },

  /**
   * Gets all students' submission statuses for a specific submission item.
   * Used by teacher to see who has submitted, who is pending, etc.
   */
  async getStudentSubmissions(teacherId, submissionItemId) {
    const submissionItem = await SubmissionItem.findById(submissionItemId)
      .populate('clearanceItemId');
    if (!submissionItem) {
      throw AppError.notFound('Submission item not found');
    }

    const clearanceItem = submissionItem.clearanceItemId;
    if (!clearanceItem) {
      throw AppError.notFound('Associated clearance item not found');
    }

    // Verify teacher ownership
    const isOwner = this._isTeacherOwner(clearanceItem, teacherId);
    if (!isOwner) {
      throw AppError.forbidden('You are not assigned to this clearance item');
    }

    // Get the relevant students based on clearance item type
    const studentIds = await this._getRelevantStudentIds(clearanceItem);

    // Fetch all students with their submission status
    const students = await User.find({ _id: { $in: studentIds } })
      .select('name email enrollmentNo section');

    // Fetch existing submissions
    const submissions = await Submission.find({
      submissionItemId,
      studentId: { $in: studentIds },
    });

    // Build a map for quick lookup
    const submissionMap = {};
    for (const sub of submissions) {
      submissionMap[sub.studentId.toString()] = sub;
    }

    // Combine student data with submission status
    const result = students.map((student) => {
      const submission = submissionMap[student._id.toString()];
      return {
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          enrollmentNo: student.enrollmentNo,
          section: student.section,
        },
        submission: submission
          ? {
              _id: submission._id,
              status: submission.status,
              submittedAt: submission.submittedAt,
              verifiedAt: submission.verifiedAt,
              remarks: submission.remarks,
            }
          : { status: 'pending' },
      };
    });

    return {
      submissionItem: {
        _id: submissionItem._id,
        title: submissionItem.title,
        type: submissionItem.type,
        deadline: submissionItem.deadline,
      },
      students: result,
    };
  },

  /**
   * Teacher verifies or rejects a student's submission.
   */
  async verifySubmission(teacherId, submissionId, status, remarks) {
    const submission = await Submission.findById(submissionId)
      .populate({
        path: 'submissionItemId',
        populate: { path: 'clearanceItemId' },
      });

    if (!submission) {
      throw AppError.notFound('Submission not found');
    }

    if (submission.status !== 'submitted') {
      throw AppError.badRequest(
        `Cannot verify a submission with status "${submission.status}". Only "submitted" items can be reviewed.`
      );
    }

    const clearanceItem = submission.submissionItemId?.clearanceItemId;
    if (!clearanceItem) {
      throw AppError.notFound('Associated clearance item not found');
    }

    // Verify teacher ownership
    const isOwner = this._isTeacherOwner(clearanceItem, teacherId);
    if (!isOwner) {
      throw AppError.forbidden('You are not authorized to verify this submission');
    }

    submission.status = status;
    submission.remarks = remarks || '';
    submission.verifiedBy = teacherId;
    submission.verifiedAt = new Date();
    await submission.save();

    logger.info('Submission verified', {
      submissionId,
      teacherId,
      status,
      studentId: submission.studentId,
    });

    // Notify the student
    const itemTitle = submission.submissionItemId?.title || 'Unknown';
    if (status === 'verified') {
      await notificationService.notifySubmissionVerified(submission.studentId, itemTitle);
      await this._autoApproveItemClearanceIfAllSubmissionsVerified(
        submission.studentId,
        clearanceItem._id || clearanceItem
      );
    } else if (status === 'rejected') {
      await notificationService.notifySubmissionRejected(submission.studentId, itemTitle, remarks);
    }

    return submission;
  },

  /**
   * Teacher bulk verifies or rejects multiple student submissions.
   * Performs strict authorization verification across all items, batched status updates,
   * and bulk notification dispatch.
   */
  async bulkVerifySubmissions(teacherId, { submissionIds, status, remarks }) {
    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      throw AppError.badRequest('submissionIds must be a non-empty array');
    }

    // 1. Fetch all requested submissions with their clearance item hierarchy
    const submissions = await Submission.find({ _id: { $in: submissionIds } })
      .populate({
        path: 'submissionItemId',
        populate: { path: 'clearanceItemId' },
      });

    if (!submissions || submissions.length === 0) {
      throw AppError.notFound('None of the requested submissions were found');
    }

    // 2. Strict Security Fence: verify teacher owns ALL targeted clearance items
    for (const sub of submissions) {
      const clearanceItem = sub.submissionItemId?.clearanceItemId;
      if (!clearanceItem || !this._isTeacherOwner(clearanceItem, teacherId)) {
        throw AppError.forbidden('You are not authorized to review one or more selected submissions');
      }
    }

    // 3. Separate valid submissions ('submitted' status) from invalid / stale ones
    const validSubmissions = [];
    const failed = [];
    const foundIdSet = new Set(submissions.map((s) => s._id.toString()));

    for (const id of submissionIds) {
      if (!foundIdSet.has(id.toString())) {
        failed.push({ id: id.toString(), reason: 'Submission record not found' });
      }
    }

    for (const sub of submissions) {
      if (sub.status !== 'submitted') {
        failed.push({
          id: sub._id.toString(),
          studentId: sub.studentId,
          reason: `Current status is "${sub.status}" (only "submitted" items can be reviewed)`,
        });
      } else {
        validSubmissions.push(sub);
      }
    }

    if (validSubmissions.length === 0) {
      return {
        processedCount: 0,
        failedCount: failed.length,
        failed,
        status,
      };
    }

    // 4. Batch update verified/rejected submissions
    const validIds = validSubmissions.map((s) => s._id);
    const now = new Date();
    await Submission.updateMany(
      { _id: { $in: validIds } },
      {
        $set: {
          status,
          remarks: remarks || '',
          verifiedBy: teacherId,
          verifiedAt: now,
        },
      }
    );

    // 5. Batch insert student notifications (single DB round-trip)
    const Notification = require('../models/Notification');
    const notificationDocs = validSubmissions.map((sub) => {
      const itemTitle = sub.submissionItemId?.title || 'Clearance Task';
      return {
        userId: sub.studentId,
        title: status === 'verified' ? 'Submission Verified ✅' : 'Submission Rejected ❌',
        message:
          status === 'verified'
            ? `Your submission for "${itemTitle}" has been verified.`
            : `Your submission for "${itemTitle}" was rejected.${remarks ? ` Reason: ${remarks}` : ''} Please re-submit.`,
        type: status === 'verified' ? 'success' : 'error',
        link: '/dashboard/submissions',
      };
    });

    if (notificationDocs.length > 0) {
      await Notification.insertMany(notificationDocs);
    }

    if (status === 'verified') {
      for (const sub of validSubmissions) {
        const cid = sub.submissionItemId?.clearanceItemId?._id || sub.submissionItemId?.clearanceItemId;
        if (cid && sub.studentId) {
          await this._autoApproveItemClearanceIfAllSubmissionsVerified(sub.studentId, cid);
        }
      }
    }

    logger.info('Bulk submissions verified', {
      teacherId,
      status,
      totalRequested: submissionIds.length,
      processedCount: validSubmissions.length,
      failedCount: failed.length,
    });

    return {
      processedCount: validSubmissions.length,
      failedCount: failed.length,
      failed,
      status,
    };
  },

  // ══════════════════════════════════════════════
  // STUDENT OPERATIONS
  // ══════════════════════════════════════════════

  /**
   * Gets all submission items relevant to a student for a given semester.
   * Resolves which ClearanceItems apply based on batch (lab) and elective choice.
   */
  async getMySubmissions(studentId, semesterId) {
    const student = await User.findById(studentId);
    if (!student) throw AppError.notFound('Student not found');

    let targetSemesterId = semesterId;
    if (!targetSemesterId && student.programId) {
      const activeSemester = await Semester.findOne({
        programId: student.programId,
        isActive: true,
      });
      if (activeSemester) targetSemesterId = activeSemester._id;
    }

    // Get all clearance items for this semester (or all items if no semester filter)
    const allClearanceItems = targetSemesterId
      ? await ClearanceItem.find({ semesterId: targetSemesterId })
      : await ClearanceItem.find();

    // Filter to only items relevant to this student
    const relevantItems = allClearanceItems.filter((item) => {
      if (item.type === 'theory' || item.type === 'special') return true;
      if (item.type === 'lab') {
        // Student must be in one of the lab batches
        if (!student.batchId) return true; // If batch not assigned yet, show all
        return item.labBatchTeachers?.some(
          (lbt) => lbt.batchId?.toString() === student.batchId?.toString()
        );
      }
      if (item.type === 'elective') {
        // Student must have selected this elective
        if (!student.selectedElective) return false;
        return item.electiveOptions?.some(
          (opt) => opt._id?.toString() === student.selectedElective?.toString()
        );
      }
      return true;
    });

    const relevantItemIds = relevantItems.map((item) => item._id);

    // Get all submission items for relevant clearance items
    const submissionItems = await SubmissionItem.find({
      clearanceItemId: { $in: relevantItemIds },
    })
      .populate('clearanceItemId', 'title type subjectCode srNo')
      .sort({ deadline: 1 });

    // Get existing submissions for this student
    const submissions = await Submission.find({
      studentId,
      submissionItemId: { $in: submissionItems.map((si) => si._id) },
    });

    const submissionMap = {};
    for (const sub of submissions) {
      submissionMap[sub.submissionItemId.toString()] = sub;
    }

    // Combine submission items with student's status
    const result = submissionItems.map((si) => {
      const submission = submissionMap[si._id.toString()];
      return {
        submissionItem: {
          _id: si._id,
          title: si.title,
          type: si.type,
          description: si.description,
          deadline: si.deadline,
          isRequired: si.isRequired,
          clearanceItem: si.clearanceItemId,
        },
        myStatus: submission
          ? {
              _id: submission._id,
              status: submission.status,
              submittedAt: submission.submittedAt,
              verifiedAt: submission.verifiedAt,
              remarks: submission.remarks,
            }
          : { status: 'pending' },
        isOverdue: !submission && new Date(si.deadline) < new Date(),
      };
    });

    return result;
  },

  /**
   * Student marks their work as submitted.
   * Creates a Submission record on-demand (lazy creation pattern).
   */
  async submitWork(studentId, submissionItemId) {
    const submissionItem = await SubmissionItem.findById(submissionItemId)
      .populate('clearanceItemId');
    if (!submissionItem) {
      throw AppError.notFound('Submission item not found');
    }

    // Check if submission already exists
    let submission = await Submission.findOne({ submissionItemId, studentId });

    if (submission) {
      if (submission.status === 'verified') {
        throw AppError.badRequest('This submission has already been verified');
      }
      if (submission.status === 'submitted') {
        throw AppError.badRequest('This submission is already marked as submitted and awaiting verification');
      }
      // If rejected, allow re-submission
      submission.status = 'submitted';
      submission.submittedAt = new Date();
      submission.remarks = '';
      submission.verifiedBy = undefined;
      submission.verifiedAt = undefined;
      await submission.save();
    } else {
      // Create new submission record (on-demand)
      submission = await Submission.create({
        submissionItemId,
        studentId,
        status: 'submitted',
        submittedAt: new Date(),
      });
    }

    logger.info('Student submitted work', {
      studentId,
      submissionItemId,
      submissionId: submission._id,
    });

    return submission;
  },

  // ══════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════

  /**
   * Checks if a teacher is assigned to a ClearanceItem.
   * Works for theory, lab (batch-specific), elective, and special types.
   */
  _isTeacherOwner(clearanceItem, teacherId) {
    const tid = teacherId.toString();

    if (clearanceItem.type === 'theory' || clearanceItem.type === 'special') {
      return clearanceItem.theoryTeacherId?.toString() === tid;
    }

    if (clearanceItem.type === 'lab') {
      return clearanceItem.labBatchTeachers.some(
        (lbt) => lbt.teacherId.toString() === tid
      );
    }

    if (clearanceItem.type === 'elective') {
      return clearanceItem.electiveOptions.some(
        (opt) => opt.teacherId.toString() === tid
      );
    }

    return false;
  },

  /**
   * Resolves which students are relevant for a given ClearanceItem.
   * - Theory/Special: All students in the semester's program + semester number.
   * - Lab: Only students in the specific batches.
   * - Elective: Only students who selected this elective.
   */
  async _getRelevantStudentIds(clearanceItem) {
    if (clearanceItem.type === 'theory' || clearanceItem.type === 'special') {
      // All students in the semester (we need to find the semester's program + sem number)
      const Semester = require('../models/Semester');
      const semester = await Semester.findById(clearanceItem.semesterId);
      if (!semester) return [];

      const students = await User.find({
        role: 'student',
        programId: semester.programId,
        currentSemester: semester.semNumber,
        isActive: true,
      }).select('_id');

      return students.map((s) => s._id);
    }

    if (clearanceItem.type === 'lab') {
      const batchIds = clearanceItem.labBatchTeachers.map((lbt) => lbt.batchId);
      const batches = await Batch.find({ _id: { $in: batchIds } });
      const studentIds = batches.flatMap((b) => b.studentIds);
      return studentIds;
    }

    if (clearanceItem.type === 'elective') {
      const optionIds = clearanceItem.electiveOptions.map((opt) => opt._id);
      const students = await User.find({
        role: 'student',
        selectedElective: { $in: optionIds },
        isActive: true,
      }).select('_id');
      return students.map((s) => s._id);
    }

    return [];
  },

  /**
   * Auto-approves a student's ItemClearance when all required submission items under that ClearanceItem are verified.
   */
  async _autoApproveItemClearanceIfAllSubmissionsVerified(studentId, clearanceItemId) {
    if (!clearanceItemId || !studentId) return;

    const cid = clearanceItemId._id ? clearanceItemId._id : clearanceItemId;

    // Find all required submission items for this clearance item
    const requiredSubmissionItems = await SubmissionItem.find({
      clearanceItemId: cid,
      isRequired: true,
    });

    const itemIds = requiredSubmissionItems.map((si) => si._id);

    const verifiedSubmissions = await Submission.find({
      studentId,
      submissionItemId: { $in: itemIds },
      status: 'verified',
    });

    if (requiredSubmissionItems.length === 0 || verifiedSubmissions.length >= requiredSubmissionItems.length) {
      const ItemClearance = require('../models/ItemClearance');
      const itemClearance = await ItemClearance.findOne({
        studentId,
        clearanceItemId: cid,
        status: 'pending',
      });

      if (itemClearance) {
        itemClearance.status = 'approved';
        itemClearance.reviewedAt = new Date();
        itemClearance.remarks = 'Auto-approved upon verifying required submissions';
        await itemClearance.save();

        logger.info('Auto-approved ItemClearance upon submission verification', {
          studentId,
          clearanceItemId: cid,
          itemClearanceId: itemClearance._id,
        });

        // Trigger stage advancement check
        const clearanceService = require('./clearance.service');
        await clearanceService._checkAndAdvanceFromItems(itemClearance.clearanceRequestId);
      }
    }
  },
};

module.exports = submissionService;
