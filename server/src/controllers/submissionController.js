import SubmissionItem from '../models/SubmissionItem.js';
import Submission from '../models/Submission.js';
import ClearanceItem from '../models/ClearanceItem.js';
import AppError from '../utils/AppError.js';
import { success, created } from '../utils/response.js';

// ═══════════════ SUBMISSION ITEMS (Teacher) ═══════════════

/**
 * GET /submissions/items — list submission items created by this teacher
 */
export const getSubmissionItems = async (req, res) => {
  const filter = {};
  // Get clearance items assigned to this teacher
  const clearanceItems = await ClearanceItem.find({
    $or: [
      { theoryTeacherId: req.user._id },
      { 'labBatchTeachers.teacherId': req.user._id },
      { 'electiveOptions.teacherId': req.user._id },
    ],
  }).select('_id');

  const itemIds = clearanceItems.map((ci) => ci._id);
  filter.clearanceItemId = { $in: itemIds };

  const items = await SubmissionItem.find(filter)
    .populate('clearanceItemId', 'title type subjectCode')
    .sort('-deadline');
  return success(res, 'Submission items retrieved', items);
};

/**
 * POST /submissions/items — create a submission item
 */
export const createSubmissionItem = async (req, res) => {
  // Verify the teacher is assigned to this clearance item
  const clearanceItem = await ClearanceItem.findById(req.body.clearanceItemId);
  if (!clearanceItem) throw AppError.notFound('Clearance item not found');

  const item = await SubmissionItem.create({
    ...req.body,
    semesterId: clearanceItem.semesterId,
  });
  return created(res, 'Submission item created', item);
};

/**
 * GET /submissions/items/:id/students — get student submissions for a specific item
 */
export const getStudentSubmissions = async (req, res) => {
  const submissionItem = await SubmissionItem.findById(req.params.id);
  if (!submissionItem) throw AppError.notFound('Submission item not found');

  const submissions = await Submission.find({ submissionItemId: req.params.id })
    .populate('studentId', 'name enrollmentNo email section')
    .populate('verifiedBy', 'name')
    .sort('studentId.name');

  return success(res, 'Student submissions retrieved', submissions);
};

// ═══════════════ SUBMISSIONS (Student) ═══════════════

/**
 * GET /submissions/my — get all submission items + submission status for current student
 */
export const getMySubmissions = async (req, res) => {
  // Get all submission items for student's semester
  const items = await SubmissionItem.find({ semesterId: req.user.currentSemesterId || undefined })
    .populate('clearanceItemId', 'title type')
    .sort('deadline');

  // Get all of this student's submissions
  const submissions = await Submission.find({ studentId: req.user._id });
  const submissionMap = {};
  for (const s of submissions) {
    submissionMap[s.submissionItemId.toString()] = s;
  }

  // Merge items with submission status
  const result = items.map((item) => {
    const obj = item.toObject();
    obj.submission = submissionMap[item._id.toString()] || null;
    return obj;
  });

  return success(res, 'Submissions retrieved', result);
};

/**
 * POST /submissions/submit — mark a submission item as submitted
 */
export const submitSubmission = async (req, res) => {
  const { submissionItemId } = req.body;

  const submissionItem = await SubmissionItem.findById(submissionItemId);
  if (!submissionItem) throw AppError.notFound('Submission item not found');

  // Upsert: create or update the submission
  const submission = await Submission.findOneAndUpdate(
    { submissionItemId, studentId: req.user._id },
    {
      submissionItemId,
      studentId: req.user._id,
      status: 'submitted',
      submittedAt: new Date(),
      remarks: '',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return success(res, 'Submission marked as submitted', submission);
};

/**
 * PATCH /submissions/:id/verify — teacher verifies or rejects a submission
 */
export const verifySubmission = async (req, res) => {
  const { status, remarks } = req.body;

  const submission = await Submission.findById(req.params.id);
  if (!submission) throw AppError.notFound('Submission not found');

  if (submission.status !== 'submitted') {
    throw AppError.badRequest('Can only verify/reject submitted items');
  }

  submission.status = status;
  submission.remarks = remarks || '';
  submission.verifiedBy = req.user._id;
  submission.verifiedAt = new Date();
  await submission.save();

  return success(res, `Submission ${status}`, submission);
};
