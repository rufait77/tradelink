import { Router } from 'express';
import { getMyCommissions, getEarningsSummary } from '../controllers/misc.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getMyCommissions);
router.get('/earnings/summary', requireAuth, getEarningsSummary);

export default router;
