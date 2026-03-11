import { Router } from 'express';
import {
  createJob, getJobs, getJob, updateJob, deleteJob,
  claimJob, startJob, completeJob, getMyReferrals, getMyClaimed,
} from '../controllers/jobs.controller';
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
router.post('/:id/claim', requireAuth, claimJob);
router.post('/:id/start', requireAuth, startJob);
router.post('/:id/complete', requireAuth, completeJob);

export default router;
