const express = require('express');
const adminController = require('../controllers/admin.controller');
const validate = require('../middleware/validate');
const v = require('../validators/admin.validator');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Clearance items list (accessible by Admin, HOD, and Teacher)
router.get('/clearance-items', protect, restrictTo('admin', 'hod', 'teacher'), adminController.getClearanceItems);

// All admin management routes require authentication
router.use(protect);

// ──────────────────────────────────────────────
// USERS (Admin: Full Control, HOD: Department Modify/Read, Teacher: Read)
// ──────────────────────────────────────────────
router.get('/users', restrictTo('admin', 'hod', 'teacher'), adminController.getUsers);
router.get('/users/:id', restrictTo('admin', 'hod', 'teacher'), adminController.getUserById);
router.put('/users/:id', restrictTo('admin', 'hod'), validate(v.updateUserSchema), adminController.updateUser);

// Admin-only creation, bulk upload, and deactivation
router.post('/users', restrictTo('admin'), validate(v.createUserSchema), adminController.createUser);
router.post('/users/bulk', restrictTo('admin'), validate(v.bulkCreateStudentsSchema), adminController.bulkCreateStudents);
if (typeof adminController.bulkUploadStudentsCsv === 'function') {
  router.post('/students/bulk-upload', restrictTo('admin'), adminController.bulkUploadStudentsCsv);
}
if (typeof adminController.downloadSampleCsv === 'function') {
  router.get('/students/sample-csv', restrictTo('admin', 'hod'), adminController.downloadSampleCsv);
}
router.patch('/users/:id/deactivate', restrictTo('admin'), adminController.deactivateUser);
router.delete('/users/:id', restrictTo('admin'), adminController.deactivateUser);

// ──────────────────────────────────────────────
// PROGRAMS
// ──────────────────────────────────────────────
router.post('/programs', restrictTo('admin'), validate(v.createProgramSchema), adminController.createProgram);
router.get('/programs', restrictTo('admin', 'hod'), adminController.getPrograms);
router.get('/programs/:id', restrictTo('admin', 'hod'), adminController.getProgramById);
router.put('/programs/:id', restrictTo('admin'), validate(v.updateProgramSchema), adminController.updateProgram);

// ──────────────────────────────────────────────
// SEMESTERS
// ──────────────────────────────────────────────
router.post('/semesters', restrictTo('admin'), validate(v.createSemesterSchema), adminController.createSemester);
router.get('/semesters', restrictTo('admin', 'hod'), adminController.getSemesters);
router.get('/semesters/:id', restrictTo('admin', 'hod'), adminController.getSemesterById);
router.put('/semesters/:id', restrictTo('admin'), validate(v.updateSemesterSchema), adminController.updateSemester);

// ──────────────────────────────────────────────
// BATCHES
// ──────────────────────────────────────────────
router.post('/batches', restrictTo('admin'), validate(v.createBatchSchema), adminController.createBatch);
router.get('/batches', restrictTo('admin', 'hod'), adminController.getBatches);
router.patch('/batches/:id/students', restrictTo('admin'), validate(v.addStudentsToBatchSchema), adminController.addStudentsToBatch);

// ──────────────────────────────────────────────
// CLEARANCE ITEMS
// ──────────────────────────────────────────────
router.post('/clearance-items', restrictTo('admin'), validate(v.createClearanceItemSchema), adminController.createClearanceItem);
router.put('/clearance-items/:id', restrictTo('admin'), validate(v.updateClearanceItemSchema), adminController.updateClearanceItem);
router.delete('/clearance-items/:id', restrictTo('admin'), adminController.deleteClearanceItem);

module.exports = router;
