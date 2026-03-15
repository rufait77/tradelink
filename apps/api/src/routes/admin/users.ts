import { Router } from 'express';
import {
  adminGetUsers,
  adminGetUserDetail,
  adminSuspendUser,
  adminUnsuspendUser,
  adminDeleteUser,
  adminChangeUserRole,
  adminVerifyUser,
  adminAddStrike,
  adminRemoveStrike,
  adminBanUser,
} from '../../controllers/admin.controller';

const router = Router();
router.get('/', adminGetUsers);
router.get('/:id', adminGetUserDetail);
router.put('/:id/suspend', adminSuspendUser);
router.put('/:id/unsuspend', adminUnsuspendUser);
router.put('/:id/role', adminChangeUserRole);
router.put('/:id/verify', adminVerifyUser);
router.put('/:id/ban', adminBanUser);
router.post('/:id/strike', adminAddStrike);
router.delete('/:id/strike/:strikeId', adminRemoveStrike);
router.delete('/:id', adminDeleteUser);
export default router;
