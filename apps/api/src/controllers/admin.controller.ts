import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';
import { updateSettings, getAllSettings } from '../../services/settings.service';
import { platformSettingsSchema } from '@tradelink/validators';
import { z } from 'zod';

// ─── GET /admin/settings ──────────────────────────────────────────────────────

export async function adminGetSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.platformSetting.findMany({ orderBy: { key: 'asc' } });
    const settings = await getAllSettings();
    res.json({ success: true, data: { settings, raw: rows } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/settings ──────────────────────────────────────────────────────

export async function adminUpdateSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const updates = req.body as Record<string, string | number | boolean>;
    const adminId = req.user!.userId;

    // Convert all values to strings for storage
    const stringUpdates: Record<string, string> = {};
    const oldValues: Record<string, string> = {};

    for (const [key, value] of Object.entries(updates)) {
      const existing = await prisma.platformSetting.findUnique({ where: { key } });
      oldValues[key] = existing?.value ?? '';
      stringUpdates[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    }

    await updateSettings(stringUpdates, adminId);

    // Write audit log
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'UPDATE_SETTINGS',
        entityType: 'PlatformSetting',
        oldValue: JSON.stringify(oldValues),
        newValue: JSON.stringify(stringUpdates),
      },
    });

    const settings = await getAllSettings();
    res.json({ success: true, data: { settings, message: 'Settings updated successfully' } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/users ─────────────────────────────────────────────────────────

export async function adminGetUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, role, status, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where: any = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role: role as any }),
      ...(status === 'active' && { isActive: true }),
      ...(status === 'suspended' && { isActive: false }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, isActive: true, isVerified: true, createdAt: true,
          profile: { select: { tradeTypes: true, avgRating: true, totalEarned: true, stripeConnectStatus: true } },
          subscription: { select: { status: true, currentPeriodEnd: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(pageSize),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: { users, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/users/:id/suspend ─────────────────────────────────────────────

export async function adminSuspendUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return next(new AppError('User not found', 404));

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await prisma.auditLog.create({
      data: { adminId: req.user!.userId, action: 'SUSPEND_USER', entityType: 'User', entityId: id },
    });

    res.json({ success: true, data: { message: 'User suspended' } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/users/:id/unsuspend ──────────────────────────────────────────

export async function adminUnsuspendUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await prisma.user.update({ where: { id }, data: { isActive: true } });
    await prisma.auditLog.create({
      data: { adminId: req.user!.userId, action: 'UNSUSPEND_USER', entityType: 'User', entityId: id },
    });
    res.json({ success: true, data: { message: 'User unsuspended' } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/jobs ──────────────────────────────────────────────────────────

export async function adminGetJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, tradeType, state, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where: any = {
      ...(status && { status: status as any }),
      ...(tradeType && { tradeType: tradeType as any }),
      ...(state && { state }),
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          postedBy: { select: { id: true, name: true, email: true } },
          claimedBy: { select: { id: true, name: true, email: true } },
          payment: { select: { totalAmount: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(pageSize),
      }),
      prisma.job.count({ where }),
    ]);

    res.json({ success: true, data: { jobs, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/jobs/:id/status ───────────────────────────────────────────────

export async function adminForceJobStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: string };
    const old = await prisma.job.findUnique({ where: { id } });
    await prisma.job.update({ where: { id }, data: { status: status as any } });
    await prisma.auditLog.create({
      data: { adminId: req.user!.userId, action: 'FORCE_JOB_STATUS', entityType: 'Job', entityId: id, oldValue: old?.status, newValue: status },
    });
    res.json({ success: true, data: { message: `Job status changed to ${status}` } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/commissions ───────────────────────────────────────────────────

export async function adminGetCommissions(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const where: any = { ...(status && { status: status as any }) };
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [items, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        include: {
          job: { select: { id: true, title: true } },
          referrer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(pageSize),
      }),
      prisma.commission.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/analytics/overview ───────────────────────────────────────────

export async function adminAnalyticsOverview(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, activeSubscriptions, openJobs, jobsThisMonth,
      completedJobsThisMonth, revenueThisMonth, pendingCommissions,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'contractor', isActive: true } }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.job.count({ where: { status: 'Open' } }),
      prisma.job.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.job.count({ where: { status: 'Completed', updatedAt: { gte: startOfMonth } } }),
      prisma.jobPayment.aggregate({ where: { status: 'paid', paidAt: { gte: startOfMonth } }, _sum: { platformFeeAmount: true } }),
      prisma.commission.aggregate({ where: { status: 'pending' }, _sum: { amount: true } }),
    ]);

    // MRR estimate = active subscriptions × subscription fee
    const subFee = await prisma.platformSetting.findUnique({ where: { key: 'subscription_fee' } });
    const mrr = activeSubscriptions * parseFloat(subFee?.value ?? '9.99');

    res.json({
      success: true,
      data: {
        totalUsers, activeSubscriptions, openJobs, jobsThisMonth,
        completedJobsThisMonth,
        platformRevenueThisMonth: revenueThisMonth._sum.platformFeeAmount ?? 0,
        pendingCommissions: pendingCommissions._sum.amount ?? 0,
        mrr: mrr.toFixed(2),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/audit-log ─────────────────────────────────────────────────────

export async function adminGetAuditLog(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', pageSize = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { admin: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(pageSize),
      }),
      prisma.auditLog.count(),
    ]);

    res.json({ success: true, data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /admin/announcements/broadcast ─────────────────────────────────────

export async function adminBroadcast(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, message, link, tradeType } = req.body as { title: string; message: string; link?: string; tradeType?: string };

    const users = await prisma.contractorProfile.findMany({
      where: tradeType ? { tradeTypes: { has: tradeType as any } } : undefined,
      select: { userId: true },
    });

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.userId,
        type: 'announcement' as any,
        title, message,
        ...(link && { link }),
      })),
    });

    res.json({ success: true, data: { sent: users.length } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/reviews ───────────────────────────────────────────────────────

export async function adminGetReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { flagged, page = '1', pageSize = '20' } = req.query as Record<string, string>;
    const where: any = { ...(flagged === 'true' && { isFlagged: true }) };
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          reviewer: { select: { id: true, name: true } },
          reviewee: { select: { id: true, name: true } },
          job: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(pageSize),
      }),
      prisma.review.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /admin/reviews/:id ────────────────────────────────────────────────

export async function adminDeleteReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.review.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: { adminId: req.user!.userId, action: 'DELETE_REVIEW', entityType: 'Review', entityId: req.params.id },
    });
    res.json({ success: true, data: { message: 'Review deleted' } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/reviews/:id/flag ──────────────────────────────────────────────

export async function adminFlagReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.review.update({ where: { id: req.params.id }, data: { isFlagged: true } });
    res.json({ success: true, data: { message: 'Review flagged' } });
  } catch (err) {
    next(err);
  }
}
