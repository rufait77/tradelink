import { Router } from 'express';
import {
  getDmConversations, getDmThread, sendDm, markDmRead,
  reactToDm, reportDm, getDmUnreadCount,
} from '../controllers/dm.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/conversations', requireAuth, getDmConversations);
router.get('/unread-count',  requireAuth, getDmUnreadCount);
router.get('/:userId',       requireAuth, getDmThread);
router.post('/:userId',      requireAuth, sendDm);
router.put('/:userId/read',  requireAuth, markDmRead);
router.post('/:messageId/react',  requireAuth, reactToDm);
router.post('/:messageId/report', requireAuth, reportDm);

export default router;
