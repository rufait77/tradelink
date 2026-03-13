import { Router } from 'express';
import { createQuote, reviseQuote, getQuote, getJobQuotes } from '../controllers/quote.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/:id', requireAuth, getQuote);
router.put('/:id/revise', requireAuth, reviseQuote);

export default router;
