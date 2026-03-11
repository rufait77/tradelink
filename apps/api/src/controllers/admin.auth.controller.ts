import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { signAdminAccessToken } from '../utils/jwt';

// ─── POST /admin/auth/login ───────────────────────────────────────────────────

export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return next(new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS'));
    }

    if (user.role !== 'admin') {
      return next(new AppError('Access denied', 403, 'FORBIDDEN'));
    }

    if (!user.isActive) {
      return next(new AppError('Admin account is inactive', 403, 'ACCOUNT_INACTIVE'));
    }

    const accessToken = signAdminAccessToken({ userId: user.id, role: 'admin' });

    res.json({
      success: true,
      data: {
        accessToken,
        admin: { id: user.id, name: user.name, email: user.email },
      },
    });
  } catch (err) {
    next(err);
  }
}
