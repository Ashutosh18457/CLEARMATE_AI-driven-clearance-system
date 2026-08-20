const taskService = require('../services/task.service');
const { sendSuccess, sendCreated } = require('../utils/response');

const taskController = {
  /**
   * @route POST /api/tasks
   * @desc Teacher creates and assigns a task to students
   * @access Private (Teacher, Admin)
   */
  async createTask(req, res, next) {
    try {
      const { title, description, deadline, assignedStudents } = req.body;
      const result = await taskService.createTask(req.user.id, {
        title,
        description,
        deadline,
        assignedStudents,
      });

      sendCreated(res, {
        data: result,
        message: `Task created successfully and notifications dispatched to ${result.assignedCount} students.`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route GET /api/tasks
   * @desc Get tasks for authenticated user based on role
   * @access Private (Teacher, Student, Admin)
   */
  async getMyTasks(req, res, next) {
    try {
      let tasks;
      if (req.user.role === 'teacher' || req.user.role === 'admin') {
        tasks = await taskService.getTeacherTasks(req.user.id);
      } else {
        tasks = await taskService.getStudentTasks(req.user.id);
      }

      sendSuccess(res, {
        data: tasks,
        message: 'Tasks retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route GET /api/tasks/:id
   * @desc Get single task details
   * @access Private
   */
  async getTaskById(req, res, next) {
    try {
      const task = await taskService.getTaskById(req.params.id);
      sendSuccess(res, {
        data: task,
        message: 'Task details retrieved',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route GET /api/tasks/students
   * @desc Get eligible students roster for task assignment
   * @access Private (Teacher, Admin, HOD)
   */
  async getStudents(req, res, next) {
    try {
      const students = await taskService.getStudentsForAssignment();
      sendSuccess(res, {
        data: students,
        message: 'Students retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route PATCH /api/tasks/:id/status
   * @desc Update task status
   * @access Private (Teacher, Admin)
   */
  async updateTaskStatus(req, res, next) {
    try {
      const task = await taskService.updateTaskStatus(req.params.id, req.body.status);
      sendSuccess(res, {
        data: task,
        message: `Task status updated to ${req.body.status}`,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = taskController;
