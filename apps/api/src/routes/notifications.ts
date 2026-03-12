import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../controllers/notifications.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getNotifications);
router.get('/unread-count', requireAuth, getUnreadCount);
router.get('/preferences', requireAuth, getNotificationPreferences);
router.put('/preferences', requireAuth, updateNotificationPreferences);
router.put('/read-all', requireAuth, markAllRead);
router.put('/:id/read', requireAuth, markRead);

export default router;
