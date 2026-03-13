import { Router } from 'express';
import { createEscrow, releaseEscrow, refundEscrow } from '../controllers/escrow.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/create', requireAuth, createEscrow);
router.post('/:id/release', requireAdmin, releaseEscrow); // admin or auto-cron
router.post('/:id/refund', requireAdmin, refundEscrow);   // admin only

export default router;
