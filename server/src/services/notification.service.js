const Notification = require('../models/Notification');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const { emitToUser, emitToUsers } = require('../config/socket');
const emailService = require('./email.service');

const notificationService = {
  /**
   * Creates a notification for a user and emits socket event.
   * This is the central method called by other services (clearance, submission, task).
   */
  async createNotification(userId, { title, message, type = 'info', link = '', senderId, taskId }) {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      link,
      senderId,
      taskId,
    });

    // Real-time WebSocket event emission
    try {
      const unreadCount = await Notification.countDocuments({ userId, isRead: false });
      emitToUser(userId, 'new_notification', {
        notification,
        unreadCount,
      });
    } catch (err) {
      logger.debug('Socket emit error on createNotification', { error: err.message });
    }

    logger.debug('Notification created', { userId, title, type });
    return notification;
  },

  /**
   * Bulk-create notifications for multiple users with the same content.
   * Useful for broadcasting (e.g., deadline reminders, task assignments).
   */
  async createBulkNotifications(userIds, { title, message, type = 'info', link = '', senderId, taskId }) {
    const docs = userIds.map((userId) => ({
      userId,
      title,
      message,
      type,
      link,
      senderId,
      taskId,
    }));

    const notifications = await Notification.insertMany(docs);

    // Real-time WebSocket event emission for each user
    for (const notif of notifications) {
      try {
        const unreadCount = await Notification.countDocuments({ userId: notif.userId, isRead: false });
        emitToUser(notif.userId, 'new_notification', {
          notification: notif,
          unreadCount,
        });
      } catch (err) {
        logger.debug('Socket emit error in createBulkNotifications', { error: err.message });
      }
    }

    logger.debug('Bulk notifications created', { count: notifications.length, title });
    return notifications;
  },

  /**
   * Gets paginated notifications for a user.
   */
  async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false }) {
    const query = { userId };
    if (unreadOnly) query.isRead = false;

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Gets the unread notification count for UI badge.
   */
  async getUnreadCount(userId) {
    return await Notification.countDocuments({ userId, isRead: false });
  },

  /**
   * Marks a single notification as read.
   */
  async markAsRead(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      throw AppError.notFound('Notification not found');
    }

    return notification;
  },

  /**
   * Marks all notifications as read for a user.
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    return { modifiedCount: result.modifiedCount };
  },

  /**
   * Deletes a notification.
   */
  async deleteNotification(userId, notificationId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw AppError.notFound('Notification not found');
    }

    return notification;
  },

  // ══════════════════════════════════════════════
  // CONVENIENCE METHODS — Used by other services
  // ══════════════════════════════════════════════

  async notifySubmissionVerified(studentId, itemTitle) {
    return this.createNotification(studentId, {
      title: 'Submission Verified ✅',
      message: `Your submission for "${itemTitle}" has been verified.`,
      type: 'success',
      link: '/dashboard/submissions',
    });
  },

  async notifySubmissionRejected(studentId, itemTitle, remarks) {
    return this.createNotification(studentId, {
      title: 'Submission Rejected ❌',
      message: `Your submission for "${itemTitle}" was rejected.${remarks ? ` Reason: ${remarks}` : ''} Please re-submit.`,
      type: 'error',
      link: '/dashboard/submissions',
    });
  },

  async notifyItemClearanceApproved(studentId, itemTitle) {
    return this.createNotification(studentId, {
      title: 'Item Cleared ✅',
      message: `"${itemTitle}" has been approved for your clearance.`,
      type: 'success',
      link: '/dashboard/clearance',
    });
  },

  async notifyItemClearanceRejected(studentId, itemTitle, remarks) {
    // 1. In-app notification
    const notification = await this.createNotification(studentId, {
      title: 'Clearance Item Rejected ❌',
      message: `"${itemTitle}" was rejected.${remarks ? ` Reason: ${remarks}` : ''} Your clearance has been halted.`,
      type: 'error',
      link: '/dashboard/clearance',
    });

    // 2. Email notification (fire-and-forget)
    try {
      const student = await User.findById(studentId).select('email name');
      if (student && student.email) {
        emailService.sendClearanceRejectionEmail({
          email: student.email,
          name: student.name,
          itemTitle,
          stage: 'Items Review',
          remarks,
        });
      }
    } catch (err) {
      logger.error('Failed to send item rejection email', { studentId, error: err.message });
    }

    return notification;
  },

  async notifyStageAdvanced(studentId, newStage) {
    const stageNames = {
      sections_review: 'Sections Review (Library, Accounts, etc.)',
      ci_review: 'Class Incharge Review',
      hod_review: 'HOD Final Review',
      completed: 'Completed! 🎉',
    };

    return this.createNotification(studentId, {
      title: 'Clearance Progress 🔄',
      message: `Your clearance has advanced to: ${stageNames[newStage] || newStage}`,
      type: newStage === 'completed' ? 'success' : 'info',
      link: '/dashboard/clearance',
    });
  },

  async notifyClearanceCompleted(studentId) {
    // 1. In-app notification
    const notification = await this.createNotification(studentId, {
      title: 'Clearance Complete! 🎓',
      message: 'Congratulations! Your semester clearance is complete. Your certificate will be generated shortly.',
      type: 'success',
      link: '/dashboard/clearance',
    });

    // 2. Email notification (fire-and-forget)
    try {
      const student = await User.findById(studentId).select('email name');
      if (student && student.email) {
        emailService.sendClearanceCompletedEmail({
          email: student.email,
          name: student.name,
        });
      }
    } catch (err) {
      logger.error('Failed to send clearance completion email', { studentId, error: err.message });
    }

    return notification;
  },

  async notifyClearanceRejected(studentId, stage, remarks) {
    // 1. In-app notification
    const notification = await this.createNotification(studentId, {
      title: 'Clearance Rejected ❌',
      message: `Your clearance was rejected at the ${stage} stage.${remarks ? ` Reason: ${remarks}` : ''} Please resolve the issue and re-initiate.`,
      type: 'error',
      link: '/dashboard/clearance',
    });

    // 2. Email notification (fire-and-forget)
    try {
      const student = await User.findById(studentId).select('email name');
      if (student && student.email) {
        emailService.sendClearanceRejectionEmail({
          email: student.email,
          name: student.name,
          itemTitle: `Clearance Request`,
          stage,
          remarks,
        });
      }
    } catch (err) {
      logger.error('Failed to send clearance rejection email', { studentId, error: err.message });
    }

    return notification;
  },

  async notifyTeacherNewClearanceItem(teacherId, studentName, itemTitle) {
    // 1. In-app notification
    const notification = await this.createNotification(teacherId, {
      title: 'New Clearance Review 📋',
      message: `${studentName} has initiated clearance. Please review "${itemTitle}".`,
      type: 'info',
      link: '/dashboard/clearance-reviews',
    });

    // 2. Email notification (fire-and-forget)
    try {
      const teacher = await User.findById(teacherId).select('email name');
      if (teacher && teacher.email) {
        emailService.sendReviewRequestEmail({
          email: teacher.email,
          name: teacher.name,
          studentName,
          itemTitle,
        });
      }
    } catch (err) {
      logger.error('Failed to send review request email', { teacherId, error: err.message });
    }

    return notification;
  },
};

module.exports = notificationService;
