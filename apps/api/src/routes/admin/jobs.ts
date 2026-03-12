import { Router } from 'express';
import {
  adminGetJobs,
  adminGetJobDetail,
  adminForceJobStatus,
  adminDeleteJob,
} from '../../controllers/admin.controller';

const router = Router();
router.get('/', adminGetJobs);
router.get('/:id', adminGetJobDetail);
router.put('/:id/status', adminForceJobStatus);
router.delete('/:id', adminDeleteJob);
export default router;
