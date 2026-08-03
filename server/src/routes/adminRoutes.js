import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import * as admin from '../controllers/adminController.js';
import {
  createProgramSchema, updateProgramSchema,
  createSemesterSchema, updateSemesterSchema,
  createBatchSchema, assignStudentsSchema,
  createUserSchema, bulkCreateUsersSchema, updateUserSchema,
  createClearanceItemSchema, updateClearanceItemSchema,
  idParamSchema,
} from '../validators/schemas.js';

const router = Router();

// Clearance Items list (accessible by both Admin and Teacher)
router.get('/clearance-items', protect, restrictTo('admin', 'teacher'), admin.getClearanceItems);

// All admin routes require auth + admin role
router.use(protect, restrictTo('admin'));

// Programs
router.get('/programs', admin.getPrograms);
router.post('/programs', validate(createProgramSchema), admin.createProgram);
router.put('/programs/:id', validate(updateProgramSchema), admin.updateProgram);

// Semesters
router.get('/semesters', admin.getSemesters);
router.post('/semesters', validate(createSemesterSchema), admin.createSemester);
router.put('/semesters/:id', validate(updateSemesterSchema), admin.updateSemester);

// Batches
router.get('/batches', admin.getBatches);
router.post('/batches', validate(createBatchSchema), admin.createBatch);
router.patch('/batches/:id/students', validate(assignStudentsSchema), admin.assignStudents);

// Users
router.get('/users', admin.getUsers);
router.post('/users', validate(createUserSchema), admin.createUser);
router.post('/users/bulk', validate(bulkCreateUsersSchema), admin.bulkCreateUsers);
router.put('/users/:id', validate(updateUserSchema), admin.updateUser);
router.patch('/users/:id/deactivate', validate(idParamSchema), admin.deactivateUser);

// Clearance Items (other operations remain admin-only)
router.post('/clearance-items', validate(createClearanceItemSchema), admin.createClearanceItem);
router.put('/clearance-items/:id', validate(updateClearanceItemSchema), admin.updateClearanceItem);
router.delete('/clearance-items/:id', validate(idParamSchema), admin.deleteClearanceItem);

export default router;
