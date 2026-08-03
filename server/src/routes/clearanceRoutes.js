import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import * as clr from '../controllers/clearanceController.js';
import { reviewClearanceSchema, idParamSchema } from '../validators/schemas.js';

const router = Router();

router.use(protect);

// ── Student ──
router.post('/initiate', restrictTo('student'), clr.initiateClearance);
router.get('/my', restrictTo('student'), clr.getMyClearance);

// ── Teacher: item clearances ──
router.get('/items/pending', restrictTo('teacher'), clr.getPendingItemClearances);
router.patch('/items/:id/review', restrictTo('teacher'), validate(reviewClearanceSchema), clr.reviewItemClearance);

// ── Section Head: section clearances ──
router.get('/sections/pending', restrictTo('section_head'), clr.getPendingSectionClearances);
router.patch('/sections/:id/review', restrictTo('section_head'), validate(reviewClearanceSchema), clr.reviewSectionClearance);

// ── Class Incharge ──
router.get('/ci/pending', restrictTo('class_incharge'), clr.getPendingCIClearances);
router.patch('/ci/:id/review', restrictTo('class_incharge'), validate(reviewClearanceSchema), clr.reviewCIClearance);

// ── HOD ──
router.get('/hod/pending', restrictTo('hod'), clr.getPendingHODClearances);
router.patch('/hod/:id/review', restrictTo('hod'), validate(reviewClearanceSchema), clr.reviewHODClearance);

export default router;
