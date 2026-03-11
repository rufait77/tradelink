import { Router } from 'express';
import { adminGetJobs, adminForceJobStatus } from '../../controllers/admin.controller';
const router = Router();
router.get('/', adminGetJobs);
router.put('/:id/status', adminForceJobStatus);
export default router;
