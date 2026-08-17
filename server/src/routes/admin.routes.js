const express = require('express');
const adminController = require('../controllers/admin.controller');
const validate = require('../middleware/validate');
const v = require('../validators/admin.validator');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Clearance items list (accessible by both Admin and Teacher)
router.get('/clearance-items', protect, restrictTo('admin', 'teacher'), adminController.getClearanceItems);

// All other admin routes require authentication + admin role
router.use(protect, restrictTo('admin'));

// ──────────────────────────────────────────────
// PROGRAMS
// ──────────────────────────────────────────────
router.post('/programs', validate(v.createProgramSchema), adminController.createProgram);
router.get('/programs', adminController.getPrograms);
router.get('/programs/:id', adminController.getProgramById);
router.put('/programs/:id', validate(v.updateProgramSchema), adminController.updateProgram);

// ──────────────────────────────────────────────
// SEMESTERS
// ──────────────────────────────────────────────
router.post('/semesters', validate(v.createSemesterSchema), adminController.createSemester);
router.get('/semesters', adminController.getSemesters);
router.get('/semesters/:id', adminController.getSemesterById);
router.put('/semesters/:id', validate(v.updateSemesterSchema), adminController.updateSemester);

// ──────────────────────────────────────────────
// BATCHES
// ──────────────────────────────────────────────
router.post('/batches', validate(v.createBatchSchema), adminController.createBatch);
router.get('/batches', adminController.getBatches);
router.patch('/batches/:id/students', validate(v.addStudentsToBatchSchema), adminController.addStudentsToBatch);

// ──────────────────────────────────────────────
// USERS
// ──────────────────────────────────────────────
router.post('/users', validate(v.createUserSchema), adminController.createUser);
router.post('/users/bulk', validate(v.bulkCreateStudentsSchema), adminController.bulkCreateStudents);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', validate(v.updateUserSchema), adminController.updateUser);
router.patch('/users/:id/deactivate', adminController.deactivateUser);

// ──────────────────────────────────────────────
// CLEARANCE ITEMS
// ──────────────────────────────────────────────
router.post('/clearance-items', validate(v.createClearanceItemSchema), adminController.createClearanceItem);
router.put('/clearance-items/:id', validate(v.updateClearanceItemSchema), adminController.updateClearanceItem);
router.delete('/clearance-items/:id', adminController.deleteClearanceItem);

module.exports = router;
