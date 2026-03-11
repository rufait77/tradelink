import { Router } from 'express';
import { adminGetCommissions } from '../../controllers/admin.controller';
const router = Router();
router.get('/', adminGetCommissions);
export default router;
