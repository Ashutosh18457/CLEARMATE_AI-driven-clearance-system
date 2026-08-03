import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import * as sub from '../controllers/submissionController.js';
import { createSubmissionItemSchema, submitSubmissionSchema, verifySubmissionSchema, idParamSchema } from '../validators/schemas.js';

const router = Router();

// All submission routes require auth
router.use(protect);

// ── Student ──
router.get('/my', restrictTo('student'), sub.getMySubmissions);
router.post('/submit', restrictTo('student'), validate(submitSubmissionSchema), sub.submitSubmission);

// ── Teacher ──
router.get('/items', restrictTo('teacher'), sub.getSubmissionItems);
router.post('/items', restrictTo('teacher'), validate(createSubmissionItemSchema), sub.createSubmissionItem);
router.get('/items/:id/students', restrictTo('teacher'), validate(idParamSchema), sub.getStudentSubmissions);

// ── Teacher: verify/reject ──
router.patch('/:id/verify', restrictTo('teacher'), validate(verifySubmissionSchema), sub.verifySubmission);

export default router;
