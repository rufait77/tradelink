import { Router } from 'express';
import { adminBroadcast } from '../../controllers/admin.controller';
const router = Router();
router.post('/broadcast', adminBroadcast);
export default router;
