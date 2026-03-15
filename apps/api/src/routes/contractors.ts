import { Router } from 'express';
import {
  getMyProfile, updateMyProfile, uploadProfilePhoto, getPublicProfile, getContractorReviews,
  uploadInsurance, uploadCertification, deleteCertification,
} from '../controllers/contractors.controller';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { contractorProfileSchema } from '@tradelink/validators';

const router = Router();

router.get('/profile', requireAuth, getMyProfile);
router.put('/profile', requireAuth, validate(contractorProfileSchema.partial()), updateMyProfile);
router.post('/profile/photo', requireAuth, uploadProfilePhoto);
router.post('/upload-insurance', requireAuth, uploadInsurance);
router.post('/upload-certification', requireAuth, uploadCertification);
router.delete('/certification/:certId', requireAuth, deleteCertification);
router.get('/:id', optionalAuth, getPublicProfile);
router.get('/:id/reviews', optionalAuth, getContractorReviews);

export default router;
