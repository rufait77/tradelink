import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type JwtPayload = {
  userId: string;
  role: 'contractor' | 'admin';
};

// ─── Contractor Tokens ────────────────────────────────────────────────────────

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}

// ─── Admin Tokens ─────────────────────────────────────────────────────────────

export function signAdminAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.ADMIN_JWT_SECRET, { expiresIn: '8h' } as jwt.SignOptions);
}

export function verifyAdminAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.ADMIN_JWT_SECRET) as JwtPayload;
}

// ─── Cookie helpers ────────────────────────────────────────────────────────────

export const REFRESH_COOKIE_NAME = 'tl_refresh';

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/auth/refresh',
};

export const clearRefreshCookieOptions = {
  ...refreshCookieOptions,
  maxAge: 0,
};
