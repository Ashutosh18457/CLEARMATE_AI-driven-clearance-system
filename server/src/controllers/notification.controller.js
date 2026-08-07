const notificationService = require('../services/notification.service');
const { sendSuccess } = require('../utils/response');

const notificationController = {
  /** @route GET /api/notifications */
  async getNotifications(req, res, next) {
    try {
      const { page, limit, unreadOnly } = req.query;
      const data = await notificationService.getUserNotifications(req.user.id, {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
        unreadOnly: unreadOnly === 'true',
      });
      sendSuccess(res, { data, message: 'Notifications retrieved' });
    } catch (error) { next(error); }
  },

  /** @route GET /api/notifications/unread-count */
  async getUnreadCount(req, res, next) {
    try {
      const count = await notificationService.getUnreadCount(req.user.id);
      sendSuccess(res, { data: { count }, message: 'Unread count retrieved' });
    } catch (error) { next(error); }
  },

  /** @route PATCH /api/notifications/:id/read */
  async markAsRead(req, res, next) {
    try {
      const notification = await notificationService.markAsRead(req.user.id, req.params.id);
      sendSuccess(res, { data: { notification }, message: 'Notification marked as read' });
    } catch (error) { next(error); }
  },

  /** @route PATCH /api/notifications/read-all */
  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user.id);
      sendSuccess(res, { data: result, message: 'All notifications marked as read' });
    } catch (error) { next(error); }
  },

  /** @route DELETE /api/notifications/:id */
  async deleteNotification(req, res, next) {
    try {
      await notificationService.deleteNotification(req.user.id, req.params.id);
      sendSuccess(res, { message: 'Notification deleted' });
    } catch (error) { next(error); }
  },
};

module.exports = notificationController;
