import { Response, NextFunction } from 'express';
import { REFERRER_FORBIDDEN_CODE } from '@tradelink/types';
import { AuthRequest } from './auth';
import { AppError } from './errorHandler';

// ─── Contractor-only guard ────────────────────────────────────────────────────
// Referrers may post referrals, pick contractors, message and get paid — but they
// cannot express interest in / claim jobs or send quotes. Must run AFTER requireAuth.

export function forbidReferrer(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }
  if (req.user.role === 'referrer') {
    return next(new AppError(
      'This action is only available to contractor accounts. Referrer accounts can post referrals but cannot claim jobs or send quotes.',
      403, REFERRER_FORBIDDEN_CODE,
    ));
  }
  next();
}
