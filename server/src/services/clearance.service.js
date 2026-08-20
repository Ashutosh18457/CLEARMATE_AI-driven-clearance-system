const ClearanceRequest = require('../models/ClearanceRequest');
const ItemClearance = require('../models/ItemClearance');
const SectionClearance = require('../models/SectionClearance');
const ClearanceItem = require('../models/ClearanceItem');
const SubmissionItem = require('../models/SubmissionItem');
const Submission = require('../models/Submission');
const Semester = require('../models/Semester');
const User = require('../models/User');
const Batch = require('../models/Batch');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const notificationService = require('./notification.service');

const SECTION_DEPARTMENTS = ['library', 'accounts', 'bus'];

const clearanceService = {
  // ══════════════════════════════════════════════
  // STUDENT OPERATIONS
  // ══════════════════════════════════════════════

  /**
   * Checks whether student has completed & verified all required submissions.
   */
  async checkPrerequisites(studentId, semesterId) {
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw AppError.badRequest('Invalid student');
    }

    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      const activeSemester = await Semester.findOne({
        programId: student.programId,
        semNumber: student.currentSemester,
        isActive: true,
      });
      if (activeSemester) targetSemesterId = activeSemester._id;
    }

    if (!targetSemesterId) {
      return { allCleared: true, totalRequired: 0, verifiedCount: 0, pendingItems: [] };
    }

    // Get all applicable clearance items for this student in this semester
    const clearanceItems = await ClearanceItem.find({ semesterId: targetSemesterId });
    const relevantItems = clearanceItems.filter((item) => {
      if (item.type === 'theory' || item.type === 'special') return true;
      if (item.type === 'lab') {
        if (!student.batchId) return false;
        return item.labBatchTeachers?.some(
          (lbt) => lbt.batchId?.toString() === student.batchId?.toString()
        );
      }
      if (item.type === 'elective') {
        if (!student.selectedElective) return false;
        return item.electiveOptions?.some(
          (opt) => opt._id?.toString() === student.selectedElective?.toString()
        );
      }
      return false;
    });

    const relevantItemIds = relevantItems.map((i) => i._id);
    const requiredSubmissionItems = await SubmissionItem.find({
      clearanceItemId: { $in: relevantItemIds },
      isRequired: true,
    }).populate('clearanceItemId', 'title type subjectCode');

    if (requiredSubmissionItems.length === 0) {
      return { allCleared: true, totalRequired: 0, verifiedCount: 0, pendingItems: [] };
    }

    const verifiedSubmissions = await Submission.find({
      studentId,
      submissionItemId: { $in: requiredSubmissionItems.map((si) => si._id) },
      status: 'verified',
    });

    const verifiedSet = new Set(verifiedSubmissions.map((s) => s.submissionItemId.toString()));
    const pendingItems = requiredSubmissionItems
      .filter((si) => !verifiedSet.has(si._id.toString()))
      .map((si) => ({
        _id: si._id,
        title: si.title,
        type: si.type,
        deadline: si.deadline,
        subject: si.clearanceItemId?.title || 'Subject',
      }));

    return {
      allCleared: pendingItems.length === 0,
      totalRequired: requiredSubmissionItems.length,
      verifiedCount: verifiedSet.size,
      pendingItems,
    };
  },

  /**
   * Initiates clearance for a student.
   * Auto-generates ItemClearance records (resolving teacher per item)
   * and SectionClearance records for all 4 departments.
   */
  async initiateClearance(studentId, semesterId) {
    // 1. Validate student (needed to resolve semester if not provided)
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw AppError.badRequest('Invalid student');
    }

    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      const activeSemester = await Semester.findOne({
        programId: student.programId,
        semNumber: student.currentSemester,
        isActive: true,
      });
      if (!activeSemester) throw AppError.notFound('No active semester found for your program');
      targetSemesterId = activeSemester._id;
    }

    // 2. Validate semester exists and is active
    const semester = await Semester.findById(targetSemesterId);
    if (!semester) throw AppError.notFound('Semester not found');
    if (!semester.isActive) throw AppError.badRequest('This semester is no longer active');

    // 3. Prerequisite check: Verify all required student submissions are completed & verified
    const prereq = await this.checkPrerequisites(studentId, semester._id);
    if (!prereq.allCleared && prereq.pendingItems.length > 0) {
      const pendingNames = prereq.pendingItems.map((p) => `"${p.title}" (${p.subject})`).join(', ');
      throw AppError.badRequest(
        `Cannot initiate clearance yet. All required submissions must be verified by teachers first. Pending items: ${pendingNames}`
      );
    }

    // 4. Check for existing clearance request
    const existing = await ClearanceRequest.findOne({ studentId, semesterId: semester._id });
    if (existing) {
      if (existing.status === 'completed') {
        throw AppError.badRequest('Clearance already completed for this semester');
      }
      if (existing.status !== 'rejected') {
        throw AppError.badRequest('A clearance request is already in progress for this semester');
      }
      // If rejected, delete old records and allow re-initiation
      await ItemClearance.deleteMany({ clearanceRequestId: existing._id });
      await SectionClearance.deleteMany({ clearanceRequestId: existing._id });
      await ClearanceRequest.findByIdAndDelete(existing._id);
      logger.info('Previous rejected clearance cleaned up for re-initiation', { studentId, semesterId: semester._id });
    }

    // 5. Create the ClearanceRequest
    const clearanceRequest = await ClearanceRequest.create({
      studentId,
      semesterId: semester._id,
      status: 'items_review',
      currentStage: 'items',
      initiatedAt: new Date(),
    });

    // 5. Auto-generate ItemClearance records
    const clearanceItems = await ClearanceItem.find({ semesterId: semester._id });
    const itemClearances = [];

    for (const item of clearanceItems) {
      // Skip items that don't apply to this student
      const resolvedTeacherId = this._resolveTeacher(item, student);
      if (!resolvedTeacherId) continue; // Item doesn't apply (e.g., wrong batch, no elective selected)

      itemClearances.push({
        clearanceRequestId: clearanceRequest._id,
        clearanceItemId: item._id,
        studentId,
        teacherId: resolvedTeacherId,
        itemTitle: item.title,
        itemType: item.type,
        status: 'pending',
      });
    }

    if (itemClearances.length > 0) {
      await ItemClearance.insertMany(itemClearances);
    }

    // 6. Auto-generate SectionClearance records for all 4 departments
    const sectionClearances = SECTION_DEPARTMENTS.map((dept) => ({
      clearanceRequestId: clearanceRequest._id,
      studentId,
      department: dept,
      status: 'pending',
    }));

    await SectionClearance.insertMany(sectionClearances);

    logger.info('Clearance initiated', {
      requestId: clearanceRequest._id,
      studentId,
      semesterId: semester._id,
      itemClearancesCreated: itemClearances.length,
    });

    return {
      clearanceRequest,
      itemClearancesCreated: itemClearances.length,
      sectionClearancesCreated: sectionClearances.length,
    };
  },

  /**
   * Gets the full clearance dashboard for a student.
   */
  async getMyClearanceStatus(studentId, semesterId) {
    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      const student = await User.findById(studentId);
      if (student && student.role === 'student') {
        const activeSemester = await Semester.findOne({
          programId: student.programId,
          semNumber: student.currentSemester,
          isActive: true,
        });
        if (activeSemester) targetSemesterId = activeSemester._id;
      }
    }

    const clearanceRequest = await ClearanceRequest.findOne({ studentId, semesterId: targetSemesterId })
      .populate('semesterId', 'name semNumber academicYear');

    if (!clearanceRequest) {
      return null; // No clearance initiated yet
    }

    const [itemClearances, sectionClearances] = await Promise.all([
      ItemClearance.find({ clearanceRequestId: clearanceRequest._id })
        .populate('teacherId', 'name email')
        .sort({ itemTitle: 1 }),
      SectionClearance.find({ clearanceRequestId: clearanceRequest._id })
        .populate('reviewerId', 'name email')
        .sort({ department: 1 }),
    ]);

    return {
      clearanceRequest,
      itemClearances,
      sectionClearances,
    };
  },

  // ══════════════════════════════════════════════
  // TEACHER OPERATIONS
  // ══════════════════════════════════════════════

  /**
   * Gets all pending ItemClearances assigned to this teacher.
   */
  async getMyPendingItems(teacherId) {
    const items = await ItemClearance.find({
      teacherId,
      status: 'pending',
    })
      .populate('studentId', 'name email enrollmentNo section')
      .populate('clearanceRequestId', 'status')
      .sort({ createdAt: 1 });

    // Only return items where the clearance request is at 'items_review' stage
    return items.filter(
      (item) => item.clearanceRequestId && item.clearanceRequestId.status === 'items_review'
    );
  },

  /**
   * Teacher approves or rejects an ItemClearance.
   * If all items are approved, auto-advances to sections_review.
   */
  async reviewItem(teacherId, itemClearanceId, status, remarks) {
    const itemClearance = await ItemClearance.findById(itemClearanceId);
    if (!itemClearance) throw AppError.notFound('Item clearance not found');

    // Verify this teacher owns the item
    if (itemClearance.teacherId.toString() !== teacherId.toString()) {
      throw AppError.forbidden('You are not authorized to review this item');
    }

    if (itemClearance.status !== 'pending') {
      throw AppError.badRequest(`This item has already been ${itemClearance.status}`);
    }

    // Update the item clearance
    itemClearance.status = status;
    itemClearance.remarks = remarks || '';
    itemClearance.reviewedAt = new Date();
    await itemClearance.save();

    logger.info('Item clearance reviewed', {
      itemClearanceId,
      teacherId,
      status,
      studentId: itemClearance.studentId,
    });

    // Handle stage advancement or rejection
    const clearanceRequest = await ClearanceRequest.findById(itemClearance.clearanceRequestId);

    if (status === 'rejected') {
      clearanceRequest.status = 'rejected';
      await clearanceRequest.save();
      logger.info('Clearance rejected at items stage', { requestId: clearanceRequest._id });
      // Notify student
      await notificationService.notifyItemClearanceRejected(
        itemClearance.studentId, itemClearance.itemTitle, remarks
      );
    } else if (status === 'approved') {
      await notificationService.notifyItemClearanceApproved(
        itemClearance.studentId, itemClearance.itemTitle
      );
      await this._checkAndAdvanceFromItems(clearanceRequest._id);
    }

    return itemClearance;
  },

  // ══════════════════════════════════════════════
  // SECTION HEAD OPERATIONS
  // ══════════════════════════════════════════════

  /**
   * Gets all pending SectionClearances for a given department type.
   */
  async getMyPendingSections(sectionType) {
    return await SectionClearance.find({
      department: sectionType,
      status: 'pending',
    })
      .populate('studentId', 'name email enrollmentNo section')
      .populate({
        path: 'clearanceRequestId',
        match: { status: 'sections_review' },
        select: 'status semesterId',
        populate: { path: 'semesterId', select: 'name semNumber' },
      })
      .sort({ createdAt: 1 })
      .then((results) =>
        // Filter out items where clearanceRequest didn't match (not at sections_review)
        results.filter((r) => r.clearanceRequestId !== null)
      );
  },

  /**
   * Section Head approves or rejects a SectionClearance.
   * If all sections approved, auto-advances to ci_review.
   */
  async reviewSection(reviewerId, sectionClearanceId, status, remarks) {
    const sectionClearance = await SectionClearance.findById(sectionClearanceId);
    if (!sectionClearance) throw AppError.notFound('Section clearance not found');

    const reviewer = await User.findById(reviewerId);
    if (reviewer && reviewer.role === 'section_head' && reviewer.sectionType !== sectionClearance.department) {
      throw AppError.forbidden(`You are only authorized to review ${reviewer.sectionType} section clearances`);
    }

    if (sectionClearance.status !== 'pending') {
      throw AppError.badRequest(`This section has already been ${sectionClearance.status}`);
    }

    // Verify the clearance is at sections_review stage
    const clearanceRequest = await ClearanceRequest.findById(sectionClearance.clearanceRequestId);
    if (!clearanceRequest || clearanceRequest.status !== 'sections_review') {
      throw AppError.badRequest('This clearance is not at the sections review stage');
    }

    sectionClearance.status = status;
    sectionClearance.remarks = remarks || '';
    sectionClearance.reviewerId = reviewerId;
    sectionClearance.reviewedAt = new Date();
    await sectionClearance.save();

    logger.info('Section clearance reviewed', {
      sectionClearanceId,
      reviewerId,
      department: sectionClearance.department,
      status,
    });

    if (status === 'rejected') {
      clearanceRequest.status = 'rejected';
      await clearanceRequest.save();
      logger.info('Clearance rejected at sections stage', { requestId: clearanceRequest._id });
      await notificationService.notifyClearanceRejected(
        sectionClearance.studentId, 'Sections Review', remarks
      );
    } else if (status === 'approved') {
      await this._checkAndAdvanceFromSections(clearanceRequest._id);
    }

    return sectionClearance;
  },

  // ══════════════════════════════════════════════
  // CLASS INCHARGE OPERATIONS
  // ══════════════════════════════════════════════

  /**
   * Gets all clearances pending CI review.
   */
  async getPendingCIReviews() {
    return await ClearanceRequest.find({ status: 'ci_review' })
      .populate('studentId', 'name email enrollmentNo section')
      .populate('semesterId', 'name semNumber academicYear')
      .sort({ createdAt: 1 });
  },

  /**
   * Class Incharge approves or rejects.
   * If approved, advances to hod_review.
   */
  async reviewCI(classInchargeId, clearanceRequestId, status, remarks) {
    const clearanceRequest = await ClearanceRequest.findById(clearanceRequestId);
    if (!clearanceRequest) throw AppError.notFound('Clearance request not found');

    if (clearanceRequest.status !== 'ci_review') {
      throw AppError.badRequest('This clearance is not at the Class Incharge review stage');
    }

    if (status === 'rejected') {
      clearanceRequest.status = 'rejected';
      await clearanceRequest.save();
      logger.info('Clearance rejected at CI stage', {
        requestId: clearanceRequestId,
        classInchargeId,
        remarks,
      });
      await notificationService.notifyClearanceRejected(
        clearanceRequest.studentId, 'Class Incharge Review', remarks
      );
    } else {
      clearanceRequest.status = 'hod_review';
      clearanceRequest.currentStage = 'hod';
      await clearanceRequest.save();
      logger.info('Clearance advanced to HOD review', {
        requestId: clearanceRequestId,
        classInchargeId,
      });
      await notificationService.notifyStageAdvanced(
        clearanceRequest.studentId, 'hod_review'
      );
    }

    return clearanceRequest;
  },

  // ══════════════════════════════════════════════
  // HOD OPERATIONS
  // ══════════════════════════════════════════════

  /**
   * Gets all clearances pending HOD review with full teacher item clearances breakdown.
   */
  async getPendingHODReviews(hodId) {
    let query = { status: 'hod_review' };
    if (hodId) {
      const hod = await User.findById(hodId);
      if (hod && hod.programId) {
        const studentIds = await User.find({ programId: hod.programId, role: 'student' }).select('_id');
        query.studentId = { $in: studentIds.map((s) => s._id) };
      }
    }

    const requests = await ClearanceRequest.find(query)
      .populate('studentId', 'name email enrollmentNo section programId')
      .populate('semesterId', 'name semNumber academicYear')
      .sort({ createdAt: 1 });

    const results = await Promise.all(
      requests.map(async (req) => {
        const [items, sections] = await Promise.all([
          ItemClearance.find({ clearanceRequestId: req._id })
            .populate('teacherId', 'name email')
            .sort({ itemTitle: 1 }),
          SectionClearance.find({ clearanceRequestId: req._id })
            .populate('reviewerId', 'name email')
            .sort({ department: 1 }),
        ]);
        return {
          ...req.toObject(),
          itemClearances: items,
          sectionClearances: sections,
        };
      })
    );

    return results;
  },

  /**
   * Gets department teachers, assigned subjects, and verification counts for HOD.
   */
  async getHODDepartmentTeachers(hodId) {
    const hod = await User.findById(hodId);
    if (!hod) throw AppError.notFound('HOD not found');

    const teachers = await User.find({ role: 'teacher' }).select('name email');
    const clearanceItems = await ClearanceItem.find()
      .populate('semesterId', 'name semNumber academicYear programId')
      .populate('theoryTeacherId', 'name email')
      .populate('labBatchTeachers.batchId', 'name')
      .populate('labBatchTeachers.teacherId', 'name email')
      .populate('electiveOptions.teacherId', 'name email');

    // Build teacher-to-subject map
    const teacherMap = {};
    for (const t of teachers) {
      teacherMap[t._id.toString()] = {
        _id: t._id,
        name: t.name,
        email: t.email,
        assignedItems: [],
        totalItemsCount: 0,
      };
    }

    for (const item of clearanceItems) {
      if (item.theoryTeacherId && teacherMap[item.theoryTeacherId._id.toString()]) {
        teacherMap[item.theoryTeacherId._id.toString()].assignedItems.push({
          _id: item._id,
          title: item.title,
          type: 'theory',
          code: item.subjectCode || item.srNo,
          semester: item.semesterId?.name,
        });
        teacherMap[item.theoryTeacherId._id.toString()].totalItemsCount += 1;
      }
      if (item.labBatchTeachers) {
        for (const lbt of item.labBatchTeachers) {
          if (lbt.teacherId && teacherMap[lbt.teacherId._id.toString()]) {
            teacherMap[lbt.teacherId._id.toString()].assignedItems.push({
              _id: item._id,
              title: `${item.title} (${lbt.batchId?.name || 'Lab Batch'})`,
              type: 'lab',
              code: item.subjectCode || item.srNo,
              semester: item.semesterId?.name,
            });
            teacherMap[lbt.teacherId._id.toString()].totalItemsCount += 1;
          }
        }
      }
      if (item.electiveOptions) {
        for (const opt of item.electiveOptions) {
          if (opt.teacherId && teacherMap[opt.teacherId._id.toString()]) {
            teacherMap[opt.teacherId._id.toString()].assignedItems.push({
              _id: item._id,
              title: `${item.title} - Option: ${opt.name}`,
              type: 'elective',
              code: item.subjectCode || item.srNo,
              semester: item.semesterId?.name,
            });
            teacherMap[opt.teacherId._id.toString()].totalItemsCount += 1;
          }
        }
      }
    }

    return Object.values(teacherMap);
  },

  /**
   * HOD final approval or rejection.
   * If approved, marks clearance as completed.
   */
  async reviewHOD(hodId, clearanceRequestId, status, remarks) {
    const clearanceRequest = await ClearanceRequest.findById(clearanceRequestId);
    if (!clearanceRequest) throw AppError.notFound('Clearance request not found');

    if (clearanceRequest.status !== 'hod_review') {
      throw AppError.badRequest('This clearance is not at the HOD review stage');
    }

    if (status === 'rejected') {
      clearanceRequest.status = 'rejected';
      await clearanceRequest.save();
      logger.info('Clearance rejected at HOD stage', {
        requestId: clearanceRequestId,
        hodId,
        remarks,
      });
      await notificationService.notifyClearanceRejected(
        clearanceRequest.studentId, 'HOD Review', remarks
      );
    } else {
      clearanceRequest.status = 'completed';
      clearanceRequest.currentStage = 'completed';
      clearanceRequest.completedAt = new Date();
      await clearanceRequest.save();
      logger.info('Clearance COMPLETED', {
        requestId: clearanceRequestId,
        hodId,
        studentId: clearanceRequest.studentId,
      });
      await notificationService.notifyClearanceCompleted(clearanceRequest.studentId);
    }

    return clearanceRequest;
  },

  // ══════════════════════════════════════════════
  // PRIVATE HELPERS — STAGE ADVANCEMENT
  // ══════════════════════════════════════════════

  /**
   * Checks if all ItemClearances are approved.
   * If yes, advances ClearanceRequest to sections_review.
   */
  async _checkAndAdvanceFromItems(clearanceRequestId) {
    const allItems = await ItemClearance.find({ clearanceRequestId });
    const allApproved = allItems.every((item) => item.status === 'approved');

    if (allApproved && allItems.length > 0) {
      const request = await ClearanceRequest.findByIdAndUpdate(clearanceRequestId, {
        status: 'sections_review',
        currentStage: 'sections',
      }, { new: true });
      logger.info('Auto-advanced to sections_review', { requestId: clearanceRequestId });
      if (request) {
        await notificationService.notifyStageAdvanced(request.studentId, 'sections_review');
      }
    }
  },

  /**
   * Checks if all SectionClearances are approved.
   * If yes, advances ClearanceRequest to ci_review.
   */
  async _checkAndAdvanceFromSections(clearanceRequestId) {
    const allSections = await SectionClearance.find({ clearanceRequestId });
    const allApproved = allSections.every((sec) => sec.status === 'approved');

    if (allApproved && allSections.length > 0) {
      const request = await ClearanceRequest.findByIdAndUpdate(clearanceRequestId, {
        status: 'ci_review',
        currentStage: 'class_incharge',
      }, { new: true });
      logger.info('Auto-advanced to ci_review', { requestId: clearanceRequestId });
      if (request) {
        await notificationService.notifyStageAdvanced(request.studentId, 'ci_review');
      }
    }
  },

  // ══════════════════════════════════════════════
  // PRIVATE HELPERS — TEACHER RESOLUTION
  // ══════════════════════════════════════════════

  /**
   * Resolves which teacher is responsible for a student's clearance
   * on a given ClearanceItem.
   *
   * Returns teacherId or null if item doesn't apply to this student.
   */
  _resolveTeacher(clearanceItem, student) {
    if (clearanceItem.type === 'theory' || clearanceItem.type === 'special') {
      return clearanceItem.theoryTeacherId || null;
    }

    if (clearanceItem.type === 'lab') {
      if (!student.batchId) return null; // Student not assigned to a batch
      const mapping = clearanceItem.labBatchTeachers.find(
        (lbt) => lbt.batchId.toString() === student.batchId.toString()
      );
      return mapping ? mapping.teacherId : null;
    }

    if (clearanceItem.type === 'elective') {
      if (!student.selectedElective) return null; // Student hasn't selected an elective
      const option = clearanceItem.electiveOptions.find(
        (opt) => opt._id.toString() === student.selectedElective.toString()
      );
      return option ? option.teacherId : null;
    }

    return null;
  },
};

module.exports = clearanceService;
