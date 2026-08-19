import ClearanceRequest from '../models/ClearanceRequest.js';
import ClearanceItem from '../models/ClearanceItem.js';
import ItemClearance from '../models/ItemClearance.js';
import SectionClearance from '../models/SectionClearance.js';
import Semester from '../models/Semester.js';
import AppError from '../utils/AppError.js';
import { success, created } from '../utils/response.js';

const SECTION_DEPARTMENTS = ['library', 'accounts', 'bus'];

// ═══════════════ STUDENT ═══════════════

/**
 * POST /clearances/initiate — start the clearance process
 */
export const initiateClearance = async (req, res) => {
  const student = req.user;

  // Find active semester for student's program
  const semester = await Semester.findOne({
    programId: student.programId,
    isActive: true,
  }).sort('-semNumber');

  if (!semester) throw AppError.badRequest('No active semester found for your program');

  // Delete existing clearance if re-initiating
  const existing = await ClearanceRequest.findOne({ studentId: student._id, semesterId: semester._id });
  if (existing) {
    await ItemClearance.deleteMany({ clearanceRequestId: existing._id });
    await SectionClearance.deleteMany({ clearanceRequestId: existing._id });
    await ClearanceRequest.deleteOne({ _id: existing._id });
  }

  // Create new clearance request
  const clearanceRequest = await ClearanceRequest.create({
    studentId: student._id,
    semesterId: semester._id,
    status: 'items_review',
    currentStage: 'items',
    initiatedAt: new Date(),
  });

  // Get all clearance items for this semester
  const clearanceItems = await ClearanceItem.find({ semesterId: semester._id });

  // Create ItemClearance for each item, determining the teacher
  const itemClearances = [];
  for (const item of clearanceItems) {
    let teacherId;
    if (item.type === 'theory' || item.type === 'special') {
      teacherId = item.theoryTeacherId;
    } else if (item.type === 'lab') {
      // Find teacher for student's batch
      const batchTeacher = item.labBatchTeachers.find(
        (bt) => bt.batchId?.toString() === student.batchId?.toString()
      );
      teacherId = batchTeacher?.teacherId || item.labBatchTeachers[0]?.teacherId;
    } else if (item.type === 'elective') {
      // Find teacher for student's selected elective
      const option = item.electiveOptions.find(
        (o) => o._id?.toString() === student.selectedElective?.toString()
      );
      teacherId = option?.teacherId || item.electiveOptions[0]?.teacherId;
    }

    if (teacherId) {
      itemClearances.push({
        clearanceRequestId: clearanceRequest._id,
        clearanceItemId: item._id,
        studentId: student._id,
        teacherId,
        itemTitle: item.title,
        itemType: item.type,
      });
    }
  }

  if (itemClearances.length > 0) {
    await ItemClearance.insertMany(itemClearances);
  }

  // Create SectionClearance for each department
  const sectionClearances = SECTION_DEPARTMENTS.map((dept) => ({
    clearanceRequestId: clearanceRequest._id,
    studentId: student._id,
    department: dept,
  }));
  await SectionClearance.insertMany(sectionClearances);

  return created(res, 'Clearance initiated successfully', clearanceRequest);
};

/**
 * GET /clearances/my — get current student's clearance status
 */
export const getMyClearance = async (req, res) => {
  const clearance = await ClearanceRequest.findOne({ studentId: req.user._id })
    .populate('semesterId', 'name academicYear')
    .sort('-createdAt');

  if (!clearance) throw AppError.notFound('No clearance request found');

  const itemClearances = await ItemClearance.find({ clearanceRequestId: clearance._id })
    .populate('teacherId', 'name email');

  const sectionClearances = await SectionClearance.find({ clearanceRequestId: clearance._id })
    .populate('reviewerId', 'name email');

  return success(res, 'Clearance status retrieved', {
    ...clearance.toObject(),
    itemClearances,
    sectionClearances,
  });
};

// ═══════════════ ITEM CLEARANCES (Teacher) ═══════════════

/**
 * GET /clearances/items/pending — get items pending review by this teacher
 */
export const getPendingItemClearances = async (req, res) => {
  const items = await ItemClearance.find({
    teacherId: req.user._id,
    status: 'pending',
  })
    .populate('studentId', 'name enrollmentNo email')
    .populate('clearanceItemId', 'title type subjectCode')
    .sort('-createdAt');

  return success(res, 'Pending item clearances retrieved', items);
};

/**
 * PATCH /clearances/items/:id/review — teacher approves/rejects an item clearance
 */
export const reviewItemClearance = async (req, res) => {
  const { status, remarks } = req.body;

  const itemClearance = await ItemClearance.findById(req.params.id);
  if (!itemClearance) throw AppError.notFound('Item clearance not found');
  if (itemClearance.teacherId.toString() !== req.user._id.toString()) {
    throw AppError.forbidden('Not authorized to review this item');
  }
  if (itemClearance.status !== 'pending') {
    throw AppError.badRequest('This item has already been reviewed');
  }

  itemClearance.status = status;
  itemClearance.remarks = remarks || '';
  itemClearance.reviewedAt = new Date();
  await itemClearance.save();

  // If rejected, reject the entire clearance
  if (status === 'rejected') {
    await ClearanceRequest.findByIdAndUpdate(itemClearance.clearanceRequestId, {
      status: 'rejected',
    });
    return success(res, 'Item clearance rejected — clearance request marked as rejected', itemClearance);
  }

  // Check if ALL items for this clearance are approved
  const allItems = await ItemClearance.find({ clearanceRequestId: itemClearance.clearanceRequestId });
  const allApproved = allItems.every((i) => i.status === 'approved');

  if (allApproved) {
    // Advance to sections_review stage
    await ClearanceRequest.findByIdAndUpdate(itemClearance.clearanceRequestId, {
      status: 'sections_review',
      currentStage: 'sections',
    });
  }

  return success(res, 'Item clearance approved', itemClearance);
};

// ═══════════════ SECTION CLEARANCES (Section Head) ═══════════════

/**
 * GET /clearances/sections/pending — get sections pending review by this section head
 */
export const getPendingSectionClearances = async (req, res) => {
  const sectionType = req.user.sectionType;
  if (!sectionType) throw AppError.badRequest('Section type not configured for your account');

  // Only show sections that are in the 'sections_review' stage
  const activeRequests = await ClearanceRequest.find({ status: 'sections_review' }).select('_id');
  const requestIds = activeRequests.map((r) => r._id);

  const sections = await SectionClearance.find({
    department: sectionType,
    status: 'pending',
    clearanceRequestId: { $in: requestIds },
  })
    .populate('studentId', 'name enrollmentNo email section')
    .sort('-createdAt');

  return success(res, 'Pending section clearances retrieved', sections);
};

/**
 * PATCH /clearances/sections/:id/review — section head approves/rejects
 */
export const reviewSectionClearance = async (req, res) => {
  const { status, remarks } = req.body;

  const section = await SectionClearance.findById(req.params.id);
  if (!section) throw AppError.notFound('Section clearance not found');
  if (section.department !== req.user.sectionType) {
    throw AppError.forbidden('Not authorized to review this department');
  }
  if (section.status !== 'pending') {
    throw AppError.badRequest('This section has already been reviewed');
  }

  section.status = status;
  section.remarks = remarks || '';
  section.reviewerId = req.user._id;
  section.reviewedAt = new Date();
  await section.save();

  if (status === 'rejected') {
    await ClearanceRequest.findByIdAndUpdate(section.clearanceRequestId, {
      status: 'rejected',
    });
    return success(res, 'Section clearance rejected — clearance request marked as rejected', section);
  }

  // Check if ALL sections for this clearance are approved
  const allSections = await SectionClearance.find({ clearanceRequestId: section.clearanceRequestId });
  const allApproved = allSections.every((s) => s.status === 'approved');

  if (allApproved) {
    await ClearanceRequest.findByIdAndUpdate(section.clearanceRequestId, {
      status: 'ci_review',
      currentStage: 'class_incharge',
    });
  }

  return success(res, 'Section clearance approved', section);
};

// ═══════════════ CLASS INCHARGE ═══════════════

/**
 * GET /clearances/ci/pending — get clearances pending CI review
 */
export const getPendingCIClearances = async (req, res) => {
  const clearances = await ClearanceRequest.find({ status: 'ci_review' })
    .populate('studentId', 'name enrollmentNo email section')
    .populate('semesterId', 'name academicYear')
    .sort('-updatedAt');

  return success(res, 'Pending CI clearances retrieved', clearances);
};

/**
 * PATCH /clearances/ci/:id/review — class incharge approves/rejects
 */
export const reviewCIClearance = async (req, res) => {
  const { status, remarks } = req.body;

  const clearance = await ClearanceRequest.findById(req.params.id);
  if (!clearance) throw AppError.notFound('Clearance request not found');
  if (clearance.status !== 'ci_review') {
    throw AppError.badRequest('This clearance is not in CI review stage');
  }

  if (status === 'rejected') {
    clearance.status = 'rejected';
    clearance.remarks = remarks || '';
    await clearance.save();
    return success(res, 'Clearance rejected', clearance);
  }

  clearance.status = 'hod_review';
  clearance.currentStage = 'hod';
  clearance.remarks = remarks || '';
  await clearance.save();

  return success(res, 'Clearance advanced to HOD review', clearance);
};

// ═══════════════ HOD ═══════════════

/**
 * GET /clearances/hod/pending — get clearances pending HOD review
 */
export const getPendingHODClearances = async (req, res) => {
  const clearances = await ClearanceRequest.find({ status: 'hod_review' })
    .populate('studentId', 'name enrollmentNo email section programId')
    .populate({
      path: 'studentId',
      populate: { path: 'programId', select: 'name code' },
    })
    .populate('semesterId', 'name academicYear')
    .sort('-updatedAt');

  return success(res, 'Pending HOD clearances retrieved', clearances);
};

/**
 * PATCH /clearances/hod/:id/review — HOD gives final approval/rejection
 */
export const reviewHODClearance = async (req, res) => {
  const { status, remarks } = req.body;

  const clearance = await ClearanceRequest.findById(req.params.id);
  if (!clearance) throw AppError.notFound('Clearance request not found');
  if (clearance.status !== 'hod_review') {
    throw AppError.badRequest('This clearance is not in HOD review stage');
  }

  if (status === 'rejected') {
    clearance.status = 'rejected';
    clearance.remarks = remarks || '';
    await clearance.save();
    return success(res, 'Clearance rejected', clearance);
  }

  clearance.status = 'completed';
  clearance.currentStage = 'completed';
  clearance.completedAt = new Date();
  clearance.remarks = remarks || '';
  await clearance.save();

  return success(res, 'Clearance completed — certificate can be generated', clearance);
};
