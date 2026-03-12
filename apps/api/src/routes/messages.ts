import { Router } from 'express';
import { getConversations, getMessages, sendMessage, markThreadRead } from '../controllers/misc.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendMessageSchema } from '@tradelink/validators';

const router = Router();

router.get('/conversations', requireAuth, getConversations);
router.get('/:jobId', requireAuth, getMessages);
router.put('/:jobId/read', requireAuth, markThreadRead);
router.post('/', requireAuth, validate(sendMessageSchema), sendMessage);

export default router;
