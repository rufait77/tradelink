import { Router } from 'express';
import { adminLogin } from '../../controllers/admin.auth.controller';
import { validate } from '../../middleware/validate';
import { loginSchema } from '@tradelink/validators';
import { rateLimit } from 'express-rate-limit';

const router = Router();

const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Stricter than contractor — 5 attempts per 15 min
  message: { success: false, error: 'Too many admin login attempts.' },
});

router.post('/login', adminAuthLimiter, validate(loginSchema), adminLogin);

export default router;
