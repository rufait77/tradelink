// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { updateSettings, getAllSettings } from '../services/settings.service';
import { platformSettingsSchema } from '@tradelink/validators';
import { z } from 'zod';

// ─── GET /admin/settings ──────────────────────────────────────────────────────

export async function adminGetSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.platformSetting.findMany({ orderBy: { key: 'asc' } });
    // Return raw key-value map so admin frontend can read ALL settings (including developer_mode)
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json({ success: true, data: { settings } });
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

    // Return updated settings as raw key-value map
    const rows = await prisma.platformSetting.findMany({ orderBy: { key: 'asc' } });
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;
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

// ─── GET /admin/users/:id ─────────────────────────────────────────────────────

export async function adminGetUserDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, isVerified: true,
        createdAt: true, updatedAt: true, stripeConnectId: true,
        profile: {
          select: {
            tradeTypes: true, bio: true, licenseNumber: true, yearsExperience: true,
            streetAddress: true, city: true, state: true, zipCode: true,
            avgRating: true, totalJobsCompleted: true, totalEarned: true,
            stripeConnectStatus: true, photoUrl: true,
            // Trust & Safety fields
            licenseFileUrl: true, insuranceUrl: true, certifications: true,
            isAdminVerified: true, isSuspended: true, suspendedUntil: true,
            isBanned: true, ghostStrikes: true, bypassWarnings: true,
          },
        },
        subscription: {
          select: { id: true, status: true, stripeSubscriptionId: true, currentPeriodStart: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
        },
        _count: {
          select: {
            postedJobs: true,
            claimedJobs: true,
            commissions: true,
            reviewsGiven: true,
            reviewsReceived: true,
            sentMessages: true,
          },
        },
      },
    });

    if (!user) return next(new AppError('User not found', 404));

    // Get recent activity, strikes
    const [recentJobs, recentCommissions, strikes] = await Promise.all([
      prisma.job.findMany({
        where: { OR: [{ postedById: id }, { claimedById: id }] },
        select: { id: true, title: true, status: true, createdAt: true, tradeType: true, budgetMax: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.commission.findMany({
        where: { referrerId: id },
        select: { id: true, amount: true, status: true, createdAt: true, job: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.contractorStrike.findMany({
        where: { contractorId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({ success: true, data: { user, recentJobs, recentCommissions, strikes } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/users/:id/suspend ─────────────────────────────────────────────

export async function adminSuspendUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
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
    const id = req.params.id as string;
    await prisma.user.update({ where: { id }, data: { isActive: true } });
    await prisma.auditLog.create({
      data: { adminId: req.user!.userId, action: 'UNSUSPEND_USER', entityType: 'User', entityId: id },
    });
    res.json({ success: true, data: { message: 'User unsuspended' } });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /admin/users/:id ──────────────────────────────────────────────────

export async function adminDeleteUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return next(new AppError('User not found', 404));
    if (user.role === 'admin') return next(new AppError('Cannot delete admin users', 403));

    // Soft-delete: deactivate + anonymize
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        email: `deleted_${id}@removed.tradelink`,
        name: 'Deleted User',
        passwordHash: '',
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        action: 'DELETE_USER',
        entityType: 'User',
        entityId: id,
        oldValue: JSON.stringify({ email: user.email, name: user.name }),
        newValue: 'soft-deleted',
      },
    });

    res.json({ success: true, data: { message: 'User soft-deleted and anonymized' } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/users/:id/role ────────────────────────────────────────────────

export async function adminChangeUserRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { role } = req.body as { role: string };

    if (!['contractor', 'admin'].includes(role)) {
      return next(new AppError('Invalid role. Must be "contractor" or "admin"', 400));
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return next(new AppError('User not found', 404));

    await prisma.user.update({ where: { id }, data: { role: role as any } });

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        action: 'CHANGE_USER_ROLE',
        entityType: 'User',
        entityId: id,
        oldValue: user.role,
        newValue: role,
      },
    });

    res.json({ success: true, data: { message: `User role changed to ${role}` } });
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

// ─── GET /admin/jobs/:id ──────────────────────────────────────────────────────

export async function adminGetJobDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        postedBy: {
          select: {
            id: true, name: true, email: true,
            profile: { select: { tradeTypes: true, avgRating: true, city: true, state: true } },
          },
        },
        claimedBy: {
          select: {
            id: true, name: true, email: true,
            profile: { select: { tradeTypes: true, avgRating: true, city: true, state: true } },
          },
        },
        payment: true,
        commission: {
          include: { referrer: { select: { id: true, name: true, email: true } } },
        },
        reviews: {
          include: {
            reviewer: { select: { id: true, name: true } },
            reviewee: { select: { id: true, name: true } },
          },
        },
        messages: {
          select: { id: true, content: true, createdAt: true, sender: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!job) return next(new AppError('Job not found', 404));

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/jobs/:id/status ───────────────────────────────────────────────

export async function adminForceJobStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { status } = req.body as { status: string };
    const old = await prisma.job.findUnique({ where: { id } });
    if (!old) return next(new AppError('Job not found', 404));

    await prisma.job.update({ where: { id }, data: { status: status as any } });
    await prisma.auditLog.create({
      data: { adminId: req.user!.userId, action: 'FORCE_JOB_STATUS', entityType: 'Job', entityId: id, oldValue: old?.status, newValue: status },
    });
    res.json({ success: true, data: { message: `Job status changed to ${status}` } });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /admin/jobs/:id ───────────────────────────────────────────────────

export async function adminDeleteJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return next(new AppError('Job not found', 404));

    // Cascade: remove all related Phase 1 + Phase 2 records, then job
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { jobId: id } }),
      prisma.review.deleteMany({ where: { jobId: id } }),
      prisma.commission.deleteMany({ where: { jobId: id } }),
      prisma.jobPayment.deleteMany({ where: { jobId: id } }),
      // Phase 2 models
      prisma.escrowPayment.deleteMany({ where: { jobId: id } }),
      prisma.quote.deleteMany({ where: { jobId: id } }),
      prisma.dispute.deleteMany({ where: { jobId: id } }),
      prisma.jobInterest.deleteMany({ where: { jobId: id } }),
      prisma.contractorStrike.deleteMany({ where: { jobId: id } }),
      prisma.clientLead.deleteMany({ where: { jobId: id } }),
      prisma.notification.deleteMany({ where: { link: { contains: id } } }),
      prisma.job.delete({ where: { id } }),
    ]);

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        action: 'DELETE_JOB',
        entityType: 'Job',
        entityId: id,
        oldValue: JSON.stringify({ title: job.title, status: job.status }),
      },
    });

    res.json({ success: true, data: { message: 'Job and related records deleted' } });
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

// ─── PUT /admin/commissions/:id/mark-paid ─────────────────────────────────────

export async function adminMarkCommissionPaid(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const commission = await prisma.commission.findUnique({ where: { id } });
    if (!commission) return next(new AppError('Commission not found', 404));
    if (commission.status === 'paid') return next(new AppError('Commission already paid', 400));

    await prisma.commission.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date() },
    });

    // Update contractor's totalEarned
    await prisma.contractorProfile.update({
      where: { userId: commission.referrerId },
      data: { totalEarned: { increment: commission.amount } },
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        action: 'MARK_COMMISSION_PAID',
        entityType: 'Commission',
        entityId: id,
        oldValue: commission.status,
        newValue: 'paid',
      },
    });

    // Notify referrer
    await prisma.notification.create({
      data: {
        userId: commission.referrerId,
        type: 'commission_paid' as any,
        title: 'Commission Paid',
        message: `Your commission of $${commission.amount} has been marked as paid by admin.`,
      },
    });

    res.json({ success: true, data: { message: 'Commission marked as paid' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /admin/commissions/:id/retry ────────────────────────────────────────

export async function adminRetryCommissionPayout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const commission = await prisma.commission.findUnique({ where: { id } });
    if (!commission) return next(new AppError('Commission not found', 404));
    if (commission.status === 'paid') return next(new AppError('Commission already paid', 400));

    // Check if referrer has Stripe Connect active
    const referrerUser = await prisma.user.findUnique({
      where: { id: commission.referrerId },
      select: { stripeConnectId: true, profile: { select: { stripeConnectStatus: true } } },
    });

    const connectId = referrerUser?.stripeConnectId;
    const connectStatus = referrerUser?.profile?.stripeConnectStatus;

    if (!connectId || connectStatus !== 'active') {
      return next(new AppError('Referrer does not have an active Stripe Connect account. Cannot process payout.', 400));
    }

    // Attempt Stripe transfer
    try {
      const stripe = (await import('../config/stripe')).stripe;
      const transfer = await stripe.transfers.create({
        amount: Math.round(commission.amount * 100), // cents
        currency: 'usd',
        destination: connectId,
        description: `Commission payout for job ${commission.jobId}`,
      });

      await prisma.commission.update({
        where: { id },
        data: { status: 'paid', paidAt: new Date(), stripeTransferId: transfer.id },
      });

      await prisma.contractorProfile.update({
        where: { userId: commission.referrerId },
        data: { totalEarned: { increment: commission.amount } },
      });

      await prisma.auditLog.create({
        data: {
          adminId: req.user!.userId,
          action: 'RETRY_COMMISSION_PAYOUT',
          entityType: 'Commission',
          entityId: id,
          newValue: `transfer=${transfer.id}`,
        },
      });

      await prisma.notification.create({
        data: {
          userId: commission.referrerId,
          type: 'commission_paid' as any,
          title: 'Commission Paid',
          message: `Your commission of $${commission.amount} has been paid via Stripe.`,
        },
      });

      res.json({ success: true, data: { message: 'Payout processed via Stripe', transferId: transfer.id } });
    } catch (stripeErr: any) {
      await prisma.commission.update({
        where: { id },
        data: { status: 'failed' as any },
      });

      await prisma.auditLog.create({
        data: {
          adminId: req.user!.userId,
          action: 'RETRY_COMMISSION_PAYOUT_FAILED',
          entityType: 'Commission',
          entityId: id,
          newValue: stripeErr.message,
        },
      });

      return next(new AppError(`Stripe payout failed: ${stripeErr.message}`, 502));
    }
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
      completedJobsThisMonth, revenueThisMonth, pendingCommissions, escrowHeld,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'contractor', isActive: true } }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.job.count({ where: { status: 'Open' } }),
      prisma.job.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.job.count({ where: { status: 'Completed', updatedAt: { gte: startOfMonth } } }),
      // Platform revenue from released escrows this month
      prisma.escrowPayment.aggregate({ where: { status: 'released', releasedAt: { gte: startOfMonth } }, _sum: { platformFeeAmount: true } }),
      // Pending commissions from funded (but not yet released) escrows
      prisma.escrowPayment.aggregate({ where: { status: 'funded' }, _sum: { commissionAmount: true } }),
      // Total escrow funds currently held
      prisma.escrowPayment.aggregate({ where: { status: 'funded' }, _sum: { totalAmount: true } }),
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
        pendingCommissions: pendingCommissions._sum.commissionAmount ?? 0,
        escrowHeld: escrowHeld._sum.totalAmount ?? 0,
        mrr: mrr.toFixed(2),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/analytics/detailed ───────────────────────────────────────────

export async function adminAnalyticsDetailed(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();

    // Last 6 months of job data for time series
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      months.push({ label: start.toLocaleString('en', { month: 'short', year: '2-digit' }), start, end });
    }

    const timeSeries = await Promise.all(
      months.map(async (m) => {
        const [jobs, completed, revenue, newUsers] = await Promise.all([
          prisma.job.count({ where: { createdAt: { gte: m.start, lte: m.end } } }),
          prisma.job.count({ where: { status: 'Completed', updatedAt: { gte: m.start, lte: m.end } } }),
          prisma.escrowPayment.aggregate({ where: { status: 'released', releasedAt: { gte: m.start, lte: m.end } }, _sum: { platformFeeAmount: true } }),
          prisma.user.count({ where: { createdAt: { gte: m.start, lte: m.end }, role: 'contractor' } }),
        ]);
        return {
          month: m.label,
          jobsPosted: jobs,
          jobsCompleted: completed,
          revenue: revenue._sum.platformFeeAmount ?? 0,
          newUsers,
        };
      }),
    );

    // Trade type breakdown
    const allJobs = await prisma.job.groupBy({
      by: ['tradeType'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Job status distribution
    const statusDist = await prisma.job.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // Top earners
    const topEarners = await prisma.contractorProfile.findMany({
      where: { totalEarned: { gt: 0 } },
      select: {
        user: { select: { id: true, name: true, email: true } },
        totalEarned: true, totalJobsCompleted: true, avgRating: true, tradeTypes: true,
      },
      orderBy: { totalEarned: 'desc' },
      take: 10,
    });

    // Revenue totals from escrow
    const [totalRevenue, totalCommissionsPaid, pendingEscrow] = await Promise.all([
      prisma.escrowPayment.aggregate({ where: { status: 'released' }, _sum: { platformFeeAmount: true } }),
      prisma.commission.aggregate({ where: { status: 'paid' }, _sum: { amount: true } }),
      prisma.escrowPayment.aggregate({ where: { status: 'funded' }, _sum: { totalAmount: true, commissionAmount: true } }),
    ]);

    res.json({
      success: true,
      data: {
        timeSeries,
        tradeBreakdown: allJobs.map((g: any) => ({ trade: g.tradeType, count: g._count.id })),
        statusDistribution: statusDist.map((s: any) => ({ status: s.status, count: s._count.id })),
        topEarners,
        totals: {
          allTimeRevenue: totalRevenue._sum.platformFeeAmount ?? 0,
          allTimeCommissionsPaid: totalCommissionsPaid._sum.amount ?? 0,
          pendingCommissions: pendingEscrow._sum.commissionAmount ?? 0,
          escrowHeld: pendingEscrow._sum.totalAmount ?? 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/audit-log ─────────────────────────────────────────────────────

export async function adminGetAuditLog(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', pageSize = '50', action, entityType, adminId } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where: any = {
      ...(action && { action: { contains: action, mode: 'insensitive' } }),
      ...(entityType && { entityType }),
      ...(adminId && { adminId }),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { admin: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(pageSize),
      }),
      prisma.auditLog.count({ where }),
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
      data: users.map((u: { userId: string }) => ({
        userId: u.userId,
        type: 'announcement' as any,
        title, message,
        ...(link && { link }),
      })),
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        action: 'BROADCAST_NOTIFICATION',
        entityType: 'Notification',
        newValue: JSON.stringify({ title, recipients: users.length, tradeType: tradeType || 'all' }),
      },
    });

    res.json({ success: true, data: { sent: users.length } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /admin/announcements/email-blast ───────────────────────────────────

export async function adminEmailBlast(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { subject, htmlBody, tradeType } = req.body as { subject: string; htmlBody: string; tradeType?: string };

    if (!subject || !htmlBody) {
      return next(new AppError('subject and htmlBody are required', 400));
    }

    const users = await prisma.contractorProfile.findMany({
      where: tradeType ? { tradeTypes: { has: tradeType as any } } : undefined,
      select: { userId: true, user: { select: { email: true, name: true } } },
    });

    // Send emails in batches (Resend batch API or sequentially)
    const { sendEmail } = await import('../services/email.service');
    let sent = 0;
    let failed = 0;

    for (const u of users) {
      try {
        await sendEmail({ to: u.user.email, subject, html: htmlBody });
        sent++;
      } catch {
        failed++;
      }
    }

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        action: 'EMAIL_BLAST',
        entityType: 'Email',
        newValue: JSON.stringify({ subject, sent, failed, tradeType: tradeType || 'all' }),
      },
    });

    res.json({ success: true, data: { sent, failed, total: users.length } });
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
    const reviewId = req.params.id as string;
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return next(new AppError('Review not found', 404));

    await prisma.review.delete({ where: { id: reviewId } });

    // Recalculate reviewee's average rating
    const agg = await prisma.review.aggregate({
      where: { revieweeId: review.revieweeId },
      _avg: { rating: true },
      _count: { id: true },
    });
    await prisma.contractorProfile.update({
      where: { userId: review.revieweeId },
      data: { avgRating: agg._avg.rating ?? 0 },
    });

    await prisma.auditLog.create({
      data: { adminId: req.user!.userId, action: 'DELETE_REVIEW', entityType: 'Review', entityId: reviewId },
    });
    res.json({ success: true, data: { message: 'Review deleted' } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/reviews/:id/flag ──────────────────────────────────────────────

export async function adminFlagReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reviewId = req.params.id as string;
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return next(new AppError('Review not found', 404));

    const newFlag = !review.isFlagged; // Toggle flag
    await prisma.review.update({ where: { id: reviewId }, data: { isFlagged: newFlag } });

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        action: newFlag ? 'FLAG_REVIEW' : 'UNFLAG_REVIEW',
        entityType: 'Review',
        entityId: reviewId,
      },
    });

    res.json({ success: true, data: { message: newFlag ? 'Review flagged' : 'Review unflagged', isFlagged: newFlag } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/users/:id/verify ──────────────────────────────────────────────

export async function adminVerifyUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    const { verified } = req.body; // boolean

    const profile = await prisma.contractorProfile.findUnique({ where: { userId: id } });
    if (!profile) return next(new AppError('Contractor profile not found', 404));

    await prisma.contractorProfile.update({
      where: { userId: id },
      data: { isAdminVerified: verified },
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        action: verified ? 'VERIFY_USER' : 'UNVERIFY_USER',
        entityType: 'User',
        entityId: id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: id,
        type: 'interest_received' as any,
        title: verified ? 'Profile Verified ✅' : 'Verification Removed',
        message: verified
          ? 'Your profile has been verified by TradeLink. You now have a verified badge.'
          : 'Your profile verification has been removed. Please contact support.',
        link: '/dashboard/profile',
      },
    });

    res.json({ success: true, data: { message: verified ? 'User verified' : 'Verification removed' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /admin/users/:id/strike ─────────────────────────────────────────────

export async function adminAddStrike(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contractorId = req.params.id;
    const { type, reason, jobId } = req.body;

    const profile = await prisma.contractorProfile.findUnique({ where: { userId: contractorId } });
    if (!profile) return next(new AppError('Contractor profile not found', 404));

    const { addStrike } = await import('../services/penalty.service');
    const result = await addStrike(contractorId, type || 'client_report', jobId || null, reason || 'Admin action');

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        action: 'ADD_STRIKE',
        entityType: 'User',
        entityId: contractorId,
        newValue: JSON.stringify({ type, reason, strikeCount: result.strikeCount }),
      },
    });

    res.json({ success: true, data: { strike: result.strike, strikeCount: result.strikeCount } });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /admin/users/:id/strike/:strikeId ─────────────────────────────────

export async function adminRemoveStrike(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id: contractorId, strikeId } = req.params;

    await prisma.contractorStrike.delete({ where: { id: strikeId } });

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        action: 'REMOVE_STRIKE',
        entityType: 'User',
        entityId: contractorId,
        newValue: JSON.stringify({ removedStrikeId: strikeId }),
      },
    });

    res.json({ success: true, data: { message: 'Strike removed' } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /admin/users/:id/ban ─────────────────────────────────────────────────

export async function adminBanUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    const { banned } = req.body; // boolean

    const profile = await prisma.contractorProfile.findUnique({ where: { userId: id } });
    if (!profile) return next(new AppError('Contractor profile not found', 404));

    await prisma.contractorProfile.update({
      where: { userId: id },
      data: {
        isBanned: banned,
        isSuspended: banned ? true : false,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.user!.userId,
        action: banned ? 'BAN_USER' : 'UNBAN_USER',
        entityType: 'User',
        entityId: id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: id,
        type: banned ? 'penalty_ban' as any : 'interest_received' as any,
        title: banned ? 'Account Banned' : 'Ban Lifted',
        message: banned
          ? 'Your account has been permanently banned. Contact support for details.'
          : 'Your account ban has been lifted. You may resume activity.',
        link: '/dashboard/profile',
      },
    });

    res.json({ success: true, data: { message: banned ? 'User banned' : 'Ban lifted' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /admin/jobs/:id/mark-bypass ───────────────────────────────────────
// 7F: Admin marks a job where contractor attempted to bypass the platform

export async function adminMarkBypass(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id;
    const { reason } = req.body;
    const adminId = req.user!.userId;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        postedBy: { select: { id: true, name: true } },
        claimedBy: { select: { id: true, name: true } },
        escrow: true,
      },
    });
    if (!job) return next(new AppError('Job not found', 404));
    if (!job.claimedById) return next(new AppError('No contractor assigned to this job', 400));

    // Add strike via penalty service
    const { addStrike } = await import('../services/penalty.service');
    const { strike, strikeCount } = await addStrike(
      job.claimedById,
      'platform_bypass',
      jobId,
      reason || 'Attempted to bypass platform payment',
    );

    // Ensure referee still gets commission
    const existingCommission = await prisma.commission.findFirst({ where: { jobId } });
    if (!existingCommission && job.escrow) {
      await prisma.commission.create({
        data: {
          jobId,
          referrerId: job.postedById,
          amount: job.escrow.commissionAmount,
          status: 'paid',
          paidAt: new Date(),
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'MARK_BYPASS',
        entityType: 'Job',
        entityId: jobId,
        newValue: JSON.stringify({ reason, contractorId: job.claimedById, strikeCount }),
      },
    });

    // Notify referee
    await prisma.notification.create({
      data: {
        userId: job.postedById,
        type: 'bypass_detected' as any,
        title: 'Bypass attempt detected on your referral',
        message: `We detected that the contractor tried to bypass the platform on "${job.title}". Your commission is protected and has been credited.`,
        link: '/dashboard/earnings',
      },
    });

    res.json({
      success: true,
      data: {
        message: `Bypass marked. Strike #${strikeCount} added to contractor.`,
        strike,
      },
    });
  } catch (err) {
    next(err);
  }
}
