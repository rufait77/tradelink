// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

// Extends Request with client lead data
export type ClientRequest = Request & {
  clientLead?: any;
  clientJob?: any;
};

// ─── Client Token Auth Middleware ─────────────────────────────────────────────
// Validates the client access token from URL params and loads the client lead + job

export async function requireClientToken(req: ClientRequest, _res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    if (!token) return next(new AppError('Access token required', 401));

    const clientLead = await prisma.clientLead.findUnique({
      where: { accessToken: token },
      include: {
        job: {
          include: {
            postedBy: { select: { id: true, name: true, email: true, profile: { select: { photoUrl: true, avgRating: true, tradeTypes: true } } } },
            claimedBy: {
              select: {
                id: true, name: true, email: true,
                profile: {
                  select: {
                    photoUrl: true, avgRating: true, tradeTypes: true, bio: true,
                    licenseNumber: true, insuranceUrl: true, isAdminVerified: true,
                    yearsExperience: true, totalJobsCompleted: true, city: true, state: true,
                  },
                },
              },
            },
            quotes: { where: { status: { in: ['sent', 'approved'] } }, orderBy: { createdAt: 'desc' }, take: 1 },
            escrow: true,
          },
        },
      },
    });

    if (!clientLead) return next(new AppError('Invalid access token', 401));
    if (clientLead.tokenExpiry && new Date() > clientLead.tokenExpiry) {
      return next(new AppError('This access link has expired', 401));
    }

    req.clientLead = clientLead;
    req.clientJob = clientLead.job;
    next();
  } catch (err) {
    next(err);
  }
}
