import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from './errorHandler';
import { prisma } from '../config/prisma';
import { isDeveloperMode } from '../services/settings.service';

// ─── Subscription Gate ────────────────────────────────────────────────────────
// Blocks actions for users without active subscription, suspended, or banned.
// Must be placed AFTER requireAuth middleware.

export async function subscriptionGate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    // Developer mode bypasses all checks
    if (await isDeveloperMode()) return next();
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { profile: true, subscription: true },
    });

    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // 1. Check banned
    if (user.profile?.isBanned) {
      return next(new AppError(
        'Your account has been permanently banned. Contact support for details.',
        403, 'ACCOUNT_BANNED',
      ));
    }

    // 2. Check suspended
    if (user.profile?.isSuspended) {
      const until = user.profile.suspendedUntil;
      const msg = until
        ? `Your account is suspended until ${until.toISOString().split('T')[0]}. Contact support for details.`
        : 'Your account is currently suspended. Contact support for details.';
      return next(new AppError(msg, 403, 'ACCOUNT_SUSPENDED'));
    }

    // 3. Check active subscription
    if (!user.subscription || user.subscription.status !== 'active') {
      return next(new AppError(
        'An active subscription is required to perform this action. Please subscribe first.',
        403, 'SUBSCRIPTION_REQUIRED',
      ));
    }

    // 4. Check subscription not expired
    if (user.subscription.currentPeriodEnd && new Date(user.subscription.currentPeriodEnd) < new Date()) {
      return next(new AppError(
        'Your subscription has expired. Please renew to continue.',
        403, 'SUBSCRIPTION_EXPIRED',
      ));
    }

    next();
  } catch (err) {
    next(err);
  }
}
