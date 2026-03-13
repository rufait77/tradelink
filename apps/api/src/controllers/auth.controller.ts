import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  clearRefreshCookieOptions,
} from '../utils/jwt';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from '../services/email.service';
import { isDeveloperMode, getSetting } from '../services/settings.service';
import { stripe } from '../config/stripe';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function tokenExpiry(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function safeUser(user: any) {
  const { passwordHash, emailVerifyToken, emailVerifyExpiry, passwordResetToken, passwordResetExpiry, ...safe } = user;
  return safe;
}

// ─── POST /auth/register ─────────────────────────────────────────────────────
// Step 1: Create user → return Stripe PaymentIntent for signup fee
// (account is not active until fee paid + email verified)

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return next(new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS'));
    }

    const devMode = await isDeveloperMode();
    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = generateToken();
    const verifyExpiry = tokenExpiry(24);

    // Create user (not yet verified or active)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerifyToken: verifyToken,
        emailVerifyExpiry: verifyExpiry,
        isVerified: false,
        isActive: false,
        profile: {
          create: {}, // Empty contractor profile created immediately
        },
      },
    });

    let clientSecret: string | null = null;
    let stripeCustomerId: string | null = null;

    if (!devMode) {
      // Create Stripe customer
      const signupFeeValue = await getSetting('signup_fee');
      const signupFeeCents = Math.round(parseFloat(signupFeeValue ?? '29.99') * 100);

      const customer = await stripe.customers.create({ email, name });
      stripeCustomerId = customer.id;

      // Create PaymentIntent for signup fee
      const paymentIntent = await stripe.paymentIntents.create({
        amount: signupFeeCents,
        currency: 'usd',
        customer: customer.id,
        metadata: { userId: user.id, type: 'signup_fee' },
        description: 'Tradelink one-time signup fee',
      });

      // Update user with Stripe customer id
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });

      clientSecret = paymentIntent.client_secret;
    } else {
      // Developer mode: skip payment, activate immediately
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });
    }

    if (devMode) {
      // Dev mode: skip email, auto-verify
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    } else {
      // Production: send verification email (non-fatal if it fails)
      try {
        await sendVerificationEmail(email, name, verifyToken);
      } catch (emailErr) {
        console.error('Failed to send verification email:', emailErr);
        // User is still created — they can request resend later
      }
    }

    res.status(201).json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        devMode,
        // clientSecret only present when devMode is false
        ...(clientSecret ? { clientSecret } : {}),
        message: devMode
          ? 'Account created in Developer Mode. No payment required. Please verify your email.'
          : 'Account created. Please complete payment and verify your email.',
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/verify-email ──────────────────────────────────────────────────

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body as { token: string };

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return next(new AppError('Verification link is invalid or has expired', 400, 'TOKEN_INVALID'));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    res.json({ success: true, data: { message: 'Email verified successfully. You can now log in.' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/resend-verification ──────────────────────────────────────────

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body as { email: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isVerified) {
      // Return success even if user not found (prevent email enumeration)
      return res.json({ success: true, data: { message: 'If this email is registered and unverified, a new link has been sent.' } });
    }

    const verifyToken = generateToken();
    const verifyExpiry = tokenExpiry(24);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: verifyToken, emailVerifyExpiry: verifyExpiry },
    });

    await sendVerificationEmail(email, user.name, verifyToken);

    res.json({ success: true, data: { message: 'If this email is registered and unverified, a new link has been sent.' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true, subscription: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    if (!user.isVerified) {
      return next(new AppError('Please verify your email address before logging in', 403, 'EMAIL_NOT_VERIFIED'));
    }

    if (!user.isActive) {
      return next(new AppError('Your account is not yet active. Please complete the signup payment.', 403, 'ACCOUNT_INACTIVE'));
    }

    if (user.role === 'admin') {
      return next(new AppError('Admin users must use the admin login portal', 403, 'USE_ADMIN_LOGIN'));
    }

    const payload = { userId: user.id, role: user.role as 'contractor' };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Set refresh token in httpOnly cookie
    const cookieOpts = rememberMe
      ? refreshCookieOptions
      : { ...refreshCookieOptions, maxAge: undefined }; // Session cookie if not remember me

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOpts);

    res.json({
      success: true,
      data: {
        accessToken,
        user: safeUser(user),
        onboardingComplete: user.profile?.onboardingComplete ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (!token) {
      return next(new AppError('No refresh token', 401, 'UNAUTHORIZED'));
    }

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user || !user.isActive) {
      return next(new AppError('Account not found or inactive', 401, 'UNAUTHORIZED'));
    }

    const newAccessToken = signAccessToken({ userId: user.id, role: user.role as 'contractor' });

    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch {
    next(new AppError('Invalid or expired refresh token', 401, 'TOKEN_INVALID'));
  }
}

// ─── POST /auth/logout ────────────────────────────────────────────────────────

export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions);
  res.json({ success: true, data: { message: 'Logged out successfully' } });
}

// ─── POST /auth/forgot-password ───────────────────────────────────────────────

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body as { email: string };

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return same response to prevent email enumeration
    if (user && user.isVerified) {
      const resetToken = generateToken();
      const resetExpiry = tokenExpiry(1); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: resetToken, passwordResetExpiry: resetExpiry },
      });

      await sendPasswordResetEmail(email, user.name, resetToken);
    }

    res.json({
      success: true,
      data: { message: 'If an account with that email exists, a password reset link has been sent.' },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/reset-password ────────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return next(new AppError('Password reset link is invalid or has expired', 400, 'TOKEN_INVALID'));
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    res.json({ success: true, data: { message: 'Password reset successfully. You can now log in.' } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { profile: true, subscription: true },
    });

    if (!user) return next(new AppError('User not found', 404, 'NOT_FOUND'));

    res.json({ success: true, data: { user: safeUser(user) } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/confirm-signup-payment ───────────────────────────────────────
// Called after Stripe payment succeeds on frontend (backup — Stripe webhook is primary)

export async function confirmSignupPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, paymentIntentId } = req.body as { userId: string; paymentIntentId: string };

    const devMode = await isDeveloperMode();
    if (devMode) {
      return res.json({ success: true, data: { message: 'Developer mode — payment bypassed' } });
    }

    // Verify with Stripe
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded' || pi.metadata.userId !== userId) {
      return next(new AppError('Payment verification failed', 400, 'PAYMENT_INVALID'));
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    res.json({ success: true, data: { message: 'Payment confirmed. Account activated.' } });
  } catch (err) {
    next(err);
  }
}
