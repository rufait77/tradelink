import { Router } from 'express';
import { adminGetAuditLog } from '../../controllers/admin.controller';
const router = Router();
router.get('/', adminGetAuditLog);
export default router;
