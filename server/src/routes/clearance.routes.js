const express = require('express');
const clearanceController = require('../controllers/clearance.controller');
const validate = require('../middleware/validate');
const v = require('../validators/clearance.validator');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All clearance routes require authentication
router.use(protect);

// ──────────────────────────────────────────────
// STUDENT & ADMIN ROUTES
// ──────────────────────────────────────────────
router.post(
  '/initiate',
  restrictTo('student', 'admin', 'super_admin'),
  validate(v.initiateClearanceSchema),
  clearanceController.initiateClearance
);

router.get(
  '/prerequisites',
  restrictTo('student', 'admin', 'super_admin'),
  clearanceController.getPrerequisites
);

router.get(
  '/my',
  restrictTo('student', 'admin', 'super_admin'),
  clearanceController.getMyClearanceStatus
);

// ──────────────────────────────────────────────
// TEACHER & ADMIN ROUTES
// ──────────────────────────────────────────────
router.get(
  '/items/pending',
  restrictTo('teacher', 'admin', 'super_admin'),
  clearanceController.getMyPendingItems
);

router.patch(
  '/items/:id/review',
  restrictTo('teacher', 'admin', 'super_admin'),
  validate(v.reviewItemSchema),
  clearanceController.reviewItem
);

// ──────────────────────────────────────────────
// SECTION HEAD & ADMIN ROUTES
// ──────────────────────────────────────────────
router.get(
  '/sections/pending',
  restrictTo('section_head', 'account_section', 'bus_section', 'admin', 'super_admin'),
  clearanceController.getMyPendingSections
);

router.patch(
  '/sections/:id/review',
  restrictTo('section_head', 'account_section', 'bus_section', 'admin', 'super_admin'),
  validate(v.reviewSectionSchema),
  clearanceController.reviewSection
);

// ──────────────────────────────────────────────
// CLASS INCHARGE & ADMIN ROUTES
// ──────────────────────────────────────────────
router.get(
  '/ci/pending',
  restrictTo('class_incharge', 'admin', 'super_admin'),
  clearanceController.getPendingCIReviews
);

router.get(
  '/ci/cohort-overview',
  restrictTo('class_incharge', 'admin', 'super_admin'),
  clearanceController.getCICohortOverview
);

router.patch(
  '/ci/:id/review',
  restrictTo('class_incharge', 'admin', 'super_admin'),
  validate(v.reviewCISchema),
  clearanceController.reviewCI
);

// ──────────────────────────────────────────────
// HOD & ADMIN ROUTES
// ──────────────────────────────────────────────
router.get(
  '/hod/pending',
  restrictTo('hod', 'admin', 'super_admin'),
  clearanceController.getPendingHODReviews
);

router.get(
  '/hod/teachers-overview',
  restrictTo('hod', 'admin', 'super_admin'),
  clearanceController.getHODDepartmentTeachers
);

router.patch(
  '/hod/:id/review',
  restrictTo('hod', 'admin', 'super_admin'),
  validate(v.reviewHODSchema),
  clearanceController.reviewHOD
);

module.exports = router;
