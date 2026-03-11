import { Router } from 'express';
import { getNotifications, getUnreadCount, markRead, markAllRead } from '../controllers/notifications.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getNotifications);
router.get('/unread-count', requireAuth, getUnreadCount);
router.put('/read-all', requireAuth, markAllRead);
router.put('/:id/read', requireAuth, markRead);

export default router;
