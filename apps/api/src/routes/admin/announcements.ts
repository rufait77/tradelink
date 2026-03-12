import { Router } from 'express';
import { adminBroadcast, adminEmailBlast } from '../../controllers/admin.controller';

const router = Router();
router.post('/broadcast', adminBroadcast);
router.post('/email-blast', adminEmailBlast);
export default router;
