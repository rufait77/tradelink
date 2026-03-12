import { Router } from 'express';
import {
  adminGetUsers,
  adminGetUserDetail,
  adminSuspendUser,
  adminUnsuspendUser,
  adminDeleteUser,
  adminChangeUserRole,
} from '../../controllers/admin.controller';

const router = Router();
router.get('/', adminGetUsers);
router.get('/:id', adminGetUserDetail);
router.put('/:id/suspend', adminSuspendUser);
router.put('/:id/unsuspend', adminUnsuspendUser);
router.put('/:id/role', adminChangeUserRole);
router.delete('/:id', adminDeleteUser);
export default router;
