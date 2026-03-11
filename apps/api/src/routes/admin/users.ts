import { Router } from 'express';
import { adminGetUsers, adminSuspendUser, adminUnsuspendUser } from '../../controllers/admin.controller';
const router = Router();
router.get('/', adminGetUsers);
router.put('/:id/suspend', adminSuspendUser);
router.put('/:id/unsuspend', adminUnsuspendUser);
export default router;
