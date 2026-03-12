import { Router } from 'express';
import { adminAnalyticsOverview, adminAnalyticsDetailed } from '../../controllers/admin.controller';

const router = Router();
router.get('/overview', adminAnalyticsOverview);
router.get('/detailed', adminAnalyticsDetailed);
export default router;
