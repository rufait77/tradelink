import { Router } from 'express';
import { stripeWebhook } from '../controllers/webhook.controller';

const router = Router();

// Raw body handled in index.ts for this route
router.post('/stripe', stripeWebhook);

export default router;
