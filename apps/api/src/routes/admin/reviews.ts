import { Router } from 'express';
import { adminGetReviews, adminDeleteReview, adminFlagReview } from '../../controllers/admin.controller';
const router = Router();
router.get('/', adminGetReviews);
router.delete('/:id', adminDeleteReview);
router.put('/:id/flag', adminFlagReview);
export default router;
