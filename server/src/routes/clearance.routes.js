const express = require('express');
const clearanceController = require('../controllers/clearance.controller');
const validate = require('../middleware/validate');
const v = require('../validators/clearance.validator');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All clearance routes require authentication
router.use(protect);

// ──────────────────────────────────────────────
// STUDENT ROUTES
// ──────────────────────────────────────────────
router.post(
  '/initiate',
  restrictTo('student'),
  validate(v.initiateClearanceSchema),
  clearanceController.initiateClearance
);

router.get(
  '/my',
  restrictTo('student'),
  clearanceController.getMyClearanceStatus
);

// ──────────────────────────────────────────────
// TEACHER ROUTES
// ──────────────────────────────────────────────
router.get(
  '/items/pending',
  restrictTo('teacher'),
  clearanceController.getMyPendingItems
);

router.patch(
  '/items/:id/review',
  restrictTo('teacher'),
  validate(v.reviewItemSchema),
  clearanceController.reviewItem
);

// ──────────────────────────────────────────────
// SECTION HEAD ROUTES
// ──────────────────────────────────────────────
router.get(
  '/sections/pending',
  restrictTo('section_head'),
  clearanceController.getMyPendingSections
);

router.patch(
  '/sections/:id/review',
  restrictTo('section_head'),
  validate(v.reviewSectionSchema),
  clearanceController.reviewSection
);

// ──────────────────────────────────────────────
// CLASS INCHARGE ROUTES
// ──────────────────────────────────────────────
router.get(
  '/ci/pending',
  restrictTo('class_incharge'),
  clearanceController.getPendingCIReviews
);

router.patch(
  '/ci/:id/review',
  restrictTo('class_incharge'),
  validate(v.reviewCISchema),
  clearanceController.reviewCI
);

// ──────────────────────────────────────────────
// HOD ROUTES
// ──────────────────────────────────────────────
router.get(
  '/hod/pending',
  restrictTo('hod'),
  clearanceController.getPendingHODReviews
);

router.patch(
  '/hod/:id/review',
  restrictTo('hod'),
  validate(v.reviewHODSchema),
  clearanceController.reviewHOD
);

module.exports = router;
