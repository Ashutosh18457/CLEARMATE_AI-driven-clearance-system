const express = require('express');
const adminController = require('../controllers/admin.controller');
const validate = require('../middleware/validate');
const v = require('../validators/admin.validator');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

const bulkSetupController = require('../controllers/bulkSetup.controller');
const bulkSetupValidator = require('../validators/bulkSetup.validator');

// Clearance items list (accessible by Admin, Super Admin, HOD, Teacher, and Class Incharge)
router.get('/clearance-items', protect, restrictTo('admin', 'super_admin', 'hod', 'teacher', 'class_incharge'), adminController.getClearanceItems);

// ──────────────────────────────────────────────
// BULK SEMESTER SETUP & CLONING (Workload Optimization)
// ──────────────────────────────────────────────
router.post(
  '/bulk-setup',
  protect,
  restrictTo('admin', 'super_admin'),
  validate(bulkSetupValidator.bulkSetupSchema),
  bulkSetupController.bulkSetupSemester
);
router.post(
  '/clone-semester',
  protect,
  restrictTo('admin', 'super_admin'),
  validate(bulkSetupValidator.cloneSemesterSchema),
  bulkSetupController.cloneSemester
);
router.get(
  '/bulk-setup/template',
  protect,
  restrictTo('admin', 'super_admin', 'hod'),
  bulkSetupController.getTemplateStructure
);

// All admin management routes require authentication
router.use(protect);

// ──────────────────────────────────────────────
// USERS (Admin & Super Admin: Full Control, HOD: Department Modify/Read, Teacher/CI: Read)
// ──────────────────────────────────────────────
router.get('/users', restrictTo('admin', 'super_admin', 'hod', 'teacher', 'class_incharge'), adminController.getUsers);
router.get('/users/:id', restrictTo('admin', 'super_admin', 'hod', 'teacher', 'class_incharge'), adminController.getUserById);
router.put('/users/:id', restrictTo('admin', 'super_admin', 'hod'), validate(v.updateUserSchema), adminController.updateUser);

// Admin / Super Admin creation, bulk upload, and deactivation
router.post('/users', restrictTo('admin', 'super_admin'), validate(v.createUserSchema), adminController.createUser);
router.post('/users/bulk', restrictTo('admin', 'super_admin'), validate(v.bulkCreateStudentsSchema), adminController.bulkCreateStudents);
if (typeof adminController.bulkUploadStudentsCsv === 'function') {
  router.post('/students/bulk-upload', restrictTo('admin', 'super_admin'), adminController.bulkUploadStudentsCsv);
}
if (typeof adminController.downloadSampleCsv === 'function') {
  router.get('/students/sample-csv', restrictTo('admin', 'super_admin', 'hod'), adminController.downloadSampleCsv);
}
router.patch('/users/:id/deactivate', restrictTo('admin', 'super_admin'), adminController.deactivateUser);
router.delete('/users/:id', restrictTo('admin', 'super_admin'), adminController.deactivateUser);

// ──────────────────────────────────────────────
// PROGRAMS
// ──────────────────────────────────────────────
router.post('/programs', restrictTo('admin', 'super_admin'), validate(v.createProgramSchema), adminController.createProgram);
router.get('/programs', restrictTo('admin', 'super_admin', 'hod', 'teacher', 'class_incharge'), adminController.getPrograms);
router.get('/programs/:id', restrictTo('admin', 'super_admin', 'hod', 'teacher', 'class_incharge'), adminController.getProgramById);
router.put('/programs/:id', restrictTo('admin', 'super_admin'), validate(v.updateProgramSchema), adminController.updateProgram);

// ──────────────────────────────────────────────
// SEMESTERS
// ──────────────────────────────────────────────
router.post('/semesters', restrictTo('admin', 'super_admin'), validate(v.createSemesterSchema), adminController.createSemester);
router.get('/semesters', restrictTo('admin', 'super_admin', 'hod', 'teacher', 'class_incharge'), adminController.getSemesters);
router.get('/semesters/:id', restrictTo('admin', 'super_admin', 'hod', 'teacher', 'class_incharge'), adminController.getSemesterById);
router.put('/semesters/:id', restrictTo('admin', 'super_admin'), validate(v.updateSemesterSchema), adminController.updateSemester);

// ──────────────────────────────────────────────
// BATCHES
// ──────────────────────────────────────────────
router.post('/batches', restrictTo('admin', 'super_admin'), validate(v.createBatchSchema), adminController.createBatch);
router.get('/batches', restrictTo('admin', 'super_admin', 'hod', 'teacher', 'class_incharge'), adminController.getBatches);
router.patch('/batches/:id/students', restrictTo('admin', 'super_admin'), validate(v.addStudentsToBatchSchema), adminController.addStudentsToBatch);

// ──────────────────────────────────────────────
// CLEARANCE ITEMS (Theory, Lab, Elective, Special)
// ──────────────────────────────────────────────
router.post('/clearance-items', restrictTo('admin', 'super_admin'), validate(v.createClearanceItemSchema), adminController.createClearanceItem);
router.put('/clearance-items/:id', restrictTo('admin', 'super_admin'), validate(v.updateClearanceItemSchema), adminController.updateClearanceItem);
router.delete('/clearance-items/:id', restrictTo('admin', 'super_admin'), adminController.deleteClearanceItem);

// ──────────────────────────────────────────────
// AUDIT LOGS (Super Admin)
// ──────────────────────────────────────────────
router.get('/audit-logs', restrictTo('admin', 'super_admin'), adminController.getAuditLogs);

// ──────────────────────────────────────────────
// CLASS INCHARGE ASSIGNMENT
// ──────────────────────────────────────────────
router.get('/class-incharges', restrictTo('admin', 'super_admin', 'hod'), adminController.getClassIncharges);
router.put('/class-incharges/:id/assign', restrictTo('admin', 'super_admin', 'hod'), adminController.assignClassIncharge);

module.exports = router;
