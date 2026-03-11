import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  confirmSignupPayment,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@tradelink/validators';
import { z } from 'zod';

const router = Router();

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for email sending routes
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, error: 'Too many email requests, please try again later.' },
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/verify-email', validate(z.object({ token: z.string().min(1) })), verifyEmail);
router.post('/resend-verification', emailLimiter, validate(z.object({ email: z.string().email() })), resendVerification);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/forgot-password', emailLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', requireAuth, getMe);
router.post('/confirm-signup-payment', validate(z.object({ userId: z.string().uuid(), paymentIntentId: z.string() })), confirmSignupPayment);

export default router;
