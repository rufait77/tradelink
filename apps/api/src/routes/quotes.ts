import { Router } from 'express';
import { getQuote, reviseQuote } from '../controllers/quote.controller';
import { requireAuth } from '../middleware/auth';
import { forbidReferrer } from '../middleware/roleGuard';

const router = Router();

router.get('/:id', requireAuth, getQuote);
// Contractor-only: referrers get 403 REFERRER_NOT_ALLOWED
router.put('/:id/revise', requireAuth, forbidReferrer, reviseQuote);

export default router;
