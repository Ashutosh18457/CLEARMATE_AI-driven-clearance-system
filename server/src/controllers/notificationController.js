import Notification from '../models/Notification.js';
import AppError from '../utils/AppError.js';
import { success } from '../utils/response.js';

/**
 * GET /notifications — list notifications for current user
 */
export const getNotifications = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [notifications, total] = await Promise.all([
    Notification.find({ userId: req.user._id })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .sort('-createdAt'),
    Notification.countDocuments({ userId: req.user._id }),
  ]);

  return success(res, 'Notifications retrieved', {
    notifications,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parseInt(limit, 10)),
  });
};

/**
 * GET /notifications/unread-count
 */
export const getUnreadCount = async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  return success(res, 'Unread count retrieved', { count });
};

/**
 * PATCH /notifications/:id/read — mark one as read
 */
export const markAsRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw AppError.notFound('Notification not found');
  return success(res, 'Notification marked as read', notification);
};

/**
 * PATCH /notifications/read-all — mark all as read
 */
export const markAllRead = async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  return success(res, 'All notifications marked as read');
};

/**
 * DELETE /notifications/:id
 */
export const deleteNotification = async (req, res) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!notification) throw AppError.notFound('Notification not found');
  return success(res, 'Notification deleted');
};

/**
 * Helper: create a notification (used internally by other controllers/services)
 */
export const createNotification = async (userId, title, message, type = 'info', link = '') => {
  return Notification.create({ userId, title, message, type, link });
};
