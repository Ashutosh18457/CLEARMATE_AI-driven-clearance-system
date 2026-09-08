const express = require('express');
const taskController = require('../controllers/task.controller');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common.validator');
const { createTaskSchema, updateTaskStatusSchema } = require('../validators/task.validator');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All task routes require authentication
router.use(protect);

router.post(
  '/',
  restrictTo('teacher', 'admin', 'super_admin', 'class_incharge'),
  validate(createTaskSchema),
  taskController.createTask
);
router.get('/students', restrictTo('teacher', 'admin', 'super_admin', 'hod', 'class_incharge'), taskController.getStudents);
router.get('/', taskController.getMyTasks);
router.get('/:id', validate(idParamSchema, 'params'), taskController.getTaskById);
router.patch(
  '/:id/status',
  restrictTo('teacher', 'admin', 'super_admin', 'class_incharge'),
  validate({ params: idParamSchema, body: updateTaskStatusSchema }),
  taskController.updateTaskStatus
);

module.exports = router;
