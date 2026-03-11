import { Router } from 'express';
import {
  createSignupIntent,
  createSubscription,
  cancelSubscription,
  getSubscriptionStatus,
  connectOnboard,
  getConnectStatus,
  processJobPayment,
} from '../controllers/payments.controller';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();

router.post('/create-intent', requireAuth, createSignupIntent);
router.post('/create-subscription', requireAuth, validate(z.object({ paymentMethodId: z.string() })), createSubscription);
router.post('/cancel-subscription', requireAuth, cancelSubscription);
router.get('/subscription-status', requireAuth, getSubscriptionStatus);
router.post('/connect/onboard', requireAuth, connectOnboard);
router.get('/connect/status', requireAuth, getConnectStatus);
router.post('/job-payment', requireAuth, validate(z.object({ jobId: z.string().uuid(), paymentMethodId: z.string() })), processJobPayment);

export default router;
