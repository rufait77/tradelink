import { Router } from 'express';
import { requireClientToken } from '../middleware/clientAuth';
import {
  getClientDashboard, approveQuote, rejectQuote,
  confirmCompletion, raiseDispute, rateContractor, reportIssue,
} from '../controllers/client.controller';

const router = Router();

// All client routes use token-based auth (no login required)
router.get('/:token', requireClientToken, getClientDashboard);
router.post('/:token/quote/:quoteId/approve', requireClientToken, approveQuote);
router.post('/:token/quote/:quoteId/reject', requireClientToken, rejectQuote);
router.post('/:token/confirm', requireClientToken, confirmCompletion);
router.post('/:token/dispute', requireClientToken, raiseDispute);
router.post('/:token/rate', requireClientToken, rateContractor);
router.post('/:token/report', requireClientToken, reportIssue);

export default router;
