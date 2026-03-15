import { Router } from 'express';
import {
  adminGetJobs,
  adminGetJobDetail,
  adminForceJobStatus,
  adminDeleteJob,
  adminMarkBypass,
} from '../../controllers/admin.controller';

const router = Router();
router.get('/', adminGetJobs);
router.get('/:id', adminGetJobDetail);
router.put('/:id/status', adminForceJobStatus);
router.delete('/:id', adminDeleteJob);
router.post('/:id/mark-bypass', adminMarkBypass);
export default router;
