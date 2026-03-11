import { Router } from 'express';
import { adminGetSettings, adminUpdateSettings } from '../../controllers/admin.controller';
const router = Router();
router.get('/', adminGetSettings);
router.put('/', adminUpdateSettings);
export default router;
