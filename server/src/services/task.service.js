const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const notificationService = require('./notification.service');
const { emitToUser } = require('../config/socket');

const taskService = {
  /**
   * Teacher creates and assigns a task to multiple students.
   * Automatically creates notifications and emits real-time WebSocket events.
   */
  async createTask(teacherId, { title, description, deadline, assignedStudents }) {
    // 1. Validate teacher
    const teacher = await User.findById(teacherId);
    if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
      throw AppError.forbidden('Only teachers and administrators can assign tasks');
    }

    // 2. Validate input fields
    if (!title || !title.trim()) {
      throw AppError.badRequest('Task title is required');
    }

    if (!deadline) {
      throw AppError.badRequest('Task deadline is required');
    }

    if (!Array.isArray(assignedStudents) || assignedStudents.length === 0) {
      throw AppError.badRequest('Please select at least one student to assign the task');
    }

    // 3. Verify students exist
    const validStudents = await User.find({
      _id: { $in: assignedStudents },
      role: 'student',
    }).select('_id name email enrollmentNo section');

    if (validStudents.length === 0) {
      throw AppError.badRequest('No valid students found from the provided selection');
    }

    const studentIds = validStudents.map((s) => s._id);

    // 4. Create Task document
    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      deadline: new Date(deadline),
      teacherId,
      assignedStudents: studentIds,
      status: 'assigned',
    });

    // Format deadline for user-friendly message
    const formattedDeadline = new Date(deadline).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 5. Create notifications and emit real-time WebSocket events
    const notificationDocs = studentIds.map((sId) => ({
      userId: sId,
      title: `New Task Assigned: ${task.title}`,
      message: `Teacher ${teacher.name} assigned you a new task "${task.title}". Due date: ${formattedDeadline}`,
      type: 'task',
      link: '/student/submissions',
      senderId: teacherId,
      taskId: task._id,
    }));

    const createdNotifications = await Notification.insertMany(notificationDocs);

    // Emit real-time Socket.IO events to each student room
    for (let i = 0; i < studentIds.length; i++) {
      const sId = studentIds[i].toString();
      const notif = createdNotifications[i];
      try {
        const unreadCount = await Notification.countDocuments({ userId: sId, isRead: false });
        emitToUser(sId, 'new_notification', {
          notification: notif,
          unreadCount,
        });
        emitToUser(sId, 'new_task', {
          task,
          assignedBy: {
            _id: teacher._id,
            name: teacher.name,
            email: teacher.email,
          },
        });
      } catch (socketErr) {
        logger.debug('Socket dispatch error in createTask', { error: socketErr.message });
      }
    }

    logger.info('Task created and real-time notifications dispatched', {
      taskId: task._id,
      teacherId,
      studentsCount: studentIds.length,
      title: task.title,
    });

    return {
      task,
      assignedCount: studentIds.length,
      assignedStudents: validStudents,
    };
  },

  /**
   * Retrieves all tasks created by a specific teacher.
   */
  async getTeacherTasks(teacherId) {
    return await Task.find({ teacherId })
      .populate('assignedStudents', 'name email enrollmentNo section programId')
      .sort({ createdAt: -1 });
  },

  /**
   * Retrieves all tasks assigned to a specific student.
   */
  async getStudentTasks(studentId) {
    return await Task.find({ assignedStudents: studentId })
      .populate('teacherId', 'name email')
      .sort({ deadline: 1 });
  },

  /**
   * Retrieves a single task by ID.
   */
  async getTaskById(taskId) {
    const task = await Task.findById(taskId)
      .populate('teacherId', 'name email')
      .populate('assignedStudents', 'name email enrollmentNo section programId');

    if (!task) {
      throw AppError.notFound('Task not found');
    }
    return task;
  },

  /**
   * Retrieves all active students eligible for task assignment.
   */
  async getStudentsForAssignment() {
    return await User.find({ role: 'student', isActive: true })
      .select('_id name email enrollmentNo section programId currentSemester batchId')
      .populate('programId', 'name code')
      .populate('batchId', 'name')
      .sort({ name: 1 });
  },

  /**
   * Updates task status (e.g. 'completed', 'cancelled').
   */
  async updateTaskStatus(taskId, status) {
    const task = await Task.findByIdAndUpdate(
      taskId,
      { status },
      { new: true, runValidators: true }
    );
    if (!task) throw AppError.notFound('Task not found');
    return task;
  },
};

module.exports = taskService;
