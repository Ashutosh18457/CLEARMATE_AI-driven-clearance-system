const express = require('express');
const taskController = require('../controllers/task.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All task routes require authentication
router.use(protect);

router.post('/', restrictTo('teacher', 'admin'), taskController.createTask);
router.get('/students', restrictTo('teacher', 'admin', 'hod'), taskController.getStudents);
router.get('/', taskController.getMyTasks);
router.get('/:id', taskController.getTaskById);
router.patch('/:id/status', restrictTo('teacher', 'admin'), taskController.updateTaskStatus);

module.exports = router;
