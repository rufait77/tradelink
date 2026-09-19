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
import { uploadCompletionPhotos } from '../controllers/contractors.controller';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { subscriptionGate } from '../middleware/subscriptionGate';
import { forbidReferrer } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { createJobSchema } from '@tradelink/validators';

const router = Router();

// Specific named routes before :id param routes
router.get('/my-referrals', requireAuth, getMyReferrals);
router.get('/my-claimed', requireAuth, getMyClaimed);

router.post('/', requireAuth, subscriptionGate, validate(createJobSchema), createJob);
router.get('/', optionalAuth, getJobs);
router.get('/:id', optionalAuth, getJob);
router.put('/:id', requireAuth, updateJob);
router.delete('/:id', requireAuth, deleteJob);

// ─── Interest & Assignment (new flow) ────────────────────────────────────────
// Contractor-only: referrers get 403 REFERRER_NOT_ALLOWED
router.post('/:id/interest', requireAuth, forbidReferrer, subscriptionGate, expressInterest);
router.delete('/:id/interest', requireAuth, withdrawInterest);
router.get('/:id/interests', requireAuth, getInterests);
router.get('/:id/my-interest', requireAuth, getMyInterest);
router.post('/:id/assign/:contractorId', requireAuth, assignContractor);
router.post('/:id/reassign', requireAuth, reassignJob);

// ─── Quote & Completion ─────────────────────────────────────────────────────
router.post('/:id/quote', requireAuth, forbidReferrer, subscriptionGate, createQuote);
router.get('/:id/quotes', requireAuth, getJobQuotes);
router.post('/:id/contractor-complete', requireAuth, forbidReferrer, contractorCompleteJob);
router.post('/:id/completion-photos', requireAuth, uploadCompletionPhotos);

// ─── Legacy flow (kept for backward compat, will be replaced) ───────────────
router.post('/:id/claim', requireAuth, forbidReferrer, claimJob);
router.post('/:id/start', requireAuth, forbidReferrer, startJob);
router.post('/:id/complete', requireAuth, forbidReferrer, completeJob);

export default router;
