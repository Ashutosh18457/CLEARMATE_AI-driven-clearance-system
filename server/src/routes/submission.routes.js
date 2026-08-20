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
// TEACHER & ADMIN ROUTES
// ──────────────────────────────────────────────
router.get(
  '/teacher-clearance-items',
  restrictTo('teacher', 'admin', 'super_admin'),
  submissionController.getTeacherClearanceItems
);

router.post(
  '/items',
  restrictTo('teacher', 'admin', 'super_admin'),
  validate(v.createSubmissionItemSchema),
  submissionController.createSubmissionItem
);

router.patch(
  '/items/:id',
  restrictTo('teacher', 'admin', 'super_admin'),
  validate(v.updateSubmissionItemSchema),
  submissionController.updateSubmissionItem
);

router.delete(
  '/items/:id',
  restrictTo('teacher', 'admin', 'super_admin'),
  submissionController.deleteSubmissionItem
);

router.get(
  '/items',
  restrictTo('teacher', 'admin', 'super_admin'),
  submissionController.getSubmissionItems
);

router.get(
  '/items/:id/students',
  restrictTo('teacher', 'admin', 'super_admin'),
  submissionController.getStudentSubmissions
);

router.patch(
  '/bulk/verify',
  restrictTo('teacher', 'admin', 'super_admin'),
  validate(v.bulkVerifySubmissionSchema),
  auditLogger('bulk_verify_submissions', 'Submission'),
  submissionController.bulkVerifySubmissions
);

router.patch(
  '/:id/verify',
  restrictTo('teacher', 'admin', 'super_admin'),
  validate(v.verifySubmissionSchema),
  submissionController.verifySubmission
);

// ──────────────────────────────────────────────
// STUDENT & ADMIN ROUTES
// ──────────────────────────────────────────────
router.get(
  '/my',
  restrictTo('student', 'admin', 'super_admin'),
  submissionController.getMySubmissions
);

router.post(
  '/submit',
  restrictTo('student', 'admin', 'super_admin'),
  validate(v.submitWorkSchema),
  submissionController.submitWork
);

module.exports = router;
