const express = require('express');
const submissionController = require('../controllers/submission.controller');
const validate = require('../middleware/validate');
const v = require('../validators/submission.validator');
const { protect, restrictTo } = require('../middleware/auth');

const auditLogger = require('../middleware/auditLogger');

const router = express.Router();

// All submission routes require authentication
router.use(protect);

// ──────────────────────────────────────────────
// TEACHER ROUTES
// ──────────────────────────────────────────────
router.get(
  '/teacher-clearance-items',
  restrictTo('teacher'),
  submissionController.getTeacherClearanceItems
);

router.post(
  '/items',
  restrictTo('teacher'),
  validate(v.createSubmissionItemSchema),
  submissionController.createSubmissionItem
);

router.patch(
  '/items/:id',
  restrictTo('teacher'),
  validate(v.updateSubmissionItemSchema),
  submissionController.updateSubmissionItem
);

router.delete(
  '/items/:id',
  restrictTo('teacher'),
  submissionController.deleteSubmissionItem
);

router.get(
  '/items',
  restrictTo('teacher'),
  submissionController.getSubmissionItems
);

router.get(
  '/items/:id/students',
  restrictTo('teacher'),
  submissionController.getStudentSubmissions
);

router.patch(
  '/bulk/verify',
  restrictTo('teacher'),
  validate(v.bulkVerifySubmissionSchema),
  auditLogger('bulk_verify_submissions', 'Submission'),
  submissionController.bulkVerifySubmissions
);

router.patch(
  '/:id/verify',
  restrictTo('teacher'),
  validate(v.verifySubmissionSchema),
  submissionController.verifySubmission
);

// ──────────────────────────────────────────────
// STUDENT ROUTES
// ──────────────────────────────────────────────
router.get(
  '/my',
  restrictTo('student', 'admin'),
  submissionController.getMySubmissions
);

router.post(
  '/submit',
  restrictTo('student', 'admin'),
  validate(v.submitWorkSchema),
  submissionController.submitWork
);

module.exports = router;
