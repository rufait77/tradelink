import { Router } from 'express';
import {
  createJob, getJobs, getJob, updateJob, deleteJob,
  claimJob, startJob, completeJob, getMyReferrals, getMyClaimed,
} from '../controllers/jobs.controller';
import {
  expressInterest, withdrawInterest, getInterests,
  assignContractor, reassignJob, getMyInterest,
} from '../controllers/interest.controller';
import { createQuote, getJobQuotes } from '../controllers/quote.controller';
import { contractorCompleteJob } from '../controllers/escrow.controller';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createJobSchema } from '@tradelink/validators';

const router = Router();

// Specific named routes before :id param routes
router.get('/my-referrals', requireAuth, getMyReferrals);
router.get('/my-claimed', requireAuth, getMyClaimed);

router.post('/', requireAuth, validate(createJobSchema), createJob);
router.get('/', optionalAuth, getJobs);
router.get('/:id', optionalAuth, getJob);
router.put('/:id', requireAuth, updateJob);
router.delete('/:id', requireAuth, deleteJob);

// ─── Interest & Assignment (new flow) ────────────────────────────────────────
router.post('/:id/interest', requireAuth, expressInterest);
router.delete('/:id/interest', requireAuth, withdrawInterest);
router.get('/:id/interests', requireAuth, getInterests);
router.get('/:id/my-interest', requireAuth, getMyInterest);
router.post('/:id/assign/:contractorId', requireAuth, assignContractor);
router.post('/:id/reassign', requireAuth, reassignJob);

// ─── Quote & Completion ─────────────────────────────────────────────────────
router.post('/:id/quote', requireAuth, createQuote);
router.get('/:id/quotes', requireAuth, getJobQuotes);
router.post('/:id/contractor-complete', requireAuth, contractorCompleteJob);

// ─── Legacy flow (kept for backward compat, will be replaced) ───────────────
router.post('/:id/claim', requireAuth, claimJob);
router.post('/:id/start', requireAuth, startJob);
router.post('/:id/complete', requireAuth, completeJob);

export default router;
