import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { verifyAccessToken, verifyAdminAccessToken, JwtPayload } from '../utils/jwt';

export type AuthRequest = Request & { user?: JwtPayload };

// ─── Contractor auth guard ────────────────────────────────────────────────────

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }
  try {
    const token = header.slice(7);
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'TOKEN_INVALID'));
  }
}

// ─── Admin auth guard ─────────────────────────────────────────────────────────

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Admin authentication required', 401, 'UNAUTHORIZED'));
  }
  try {
    const token = header.slice(7);
    const payload = verifyAdminAccessToken(token);
    if (payload.role !== 'admin') {
      return next(new AppError('Admin access required', 403, 'FORBIDDEN'));
    }
    req.user = payload;
    next();
  } catch {
    next(new AppError('Invalid or expired admin token', 401, 'TOKEN_INVALID'));
  }
}

// ─── Optional auth (for public routes that may be authed) ────────────────────

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}
