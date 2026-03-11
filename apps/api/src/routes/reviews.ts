import { Router } from 'express';
import { createReview } from '../controllers/misc.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createReviewSchema } from '@tradelink/validators';

const router = Router();

router.post('/', requireAuth, validate(createReviewSchema), createReview);

export default router;
