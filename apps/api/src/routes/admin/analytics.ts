import { Router } from 'express';
import { adminAnalyticsOverview } from '../../controllers/admin.controller';
const router = Router();
router.get('/overview', adminAnalyticsOverview);
export default router;
