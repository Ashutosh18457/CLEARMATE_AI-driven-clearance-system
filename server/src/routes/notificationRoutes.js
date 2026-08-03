import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import * as notif from '../controllers/notificationController.js';
import { idParamSchema } from '../validators/schemas.js';

const router = Router();

router.use(protect);

router.get('/', notif.getNotifications);
router.get('/unread-count', notif.getUnreadCount);
router.patch('/read-all', notif.markAllRead);
router.patch('/:id/read', validate(idParamSchema), notif.markAsRead);
router.delete('/:id', validate(idParamSchema), notif.deleteNotification);

export default router;
