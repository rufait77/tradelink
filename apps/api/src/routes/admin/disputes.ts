import { Router } from 'express';
import { getDisputes, getDisputeDetail, resolveDispute } from '../../controllers/dispute.controller';

const router = Router();

router.get('/', getDisputes);
router.get('/:id', getDisputeDetail);
router.post('/:id/resolve', resolveDispute);

export default router;
