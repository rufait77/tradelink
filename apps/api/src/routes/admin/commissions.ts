import { Router } from 'express';
import {
  adminGetCommissions,
  adminMarkCommissionPaid,
  adminRetryCommissionPayout,
} from '../../controllers/admin.controller';

const router = Router();
router.get('/', adminGetCommissions);
router.put('/:id/mark-paid', adminMarkCommissionPaid);
router.post('/:id/retry', adminRetryCommissionPayout);
export default router;
