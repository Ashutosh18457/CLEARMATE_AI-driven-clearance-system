const express = require('express');
const notificationController = require('../controllers/notification.controller');
const validate = require('../middleware/validate');
const { idParamSchema, studentIdParamSchema } = require('../validators/common.validator');
const { notificationQuerySchema } = require('../validators/notification.validator');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All notification routes require authentication (any role)
router.use(protect);

router.get('/', validate(notificationQuerySchema, 'query'), notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/:studentId', validate({ params: studentIdParamSchema, query: notificationQuerySchema }), notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', validate(idParamSchema, 'params'), notificationController.markAsRead);
router.put('/:id/read', validate(idParamSchema, 'params'), notificationController.markAsRead);
router.delete('/:id', validate(idParamSchema, 'params'), notificationController.deleteNotification);

module.exports = router;
