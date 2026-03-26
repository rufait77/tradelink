// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { addDays, addHours } from 'date-fns';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { getSetting } from '../services/settings.service';
import {
  sendJobClaimedEmail, sendJobCompletedEmail,
  sendClientJobInProgressEmail, sendClientContractorDoneEmail,
} from '../services/email.service';
import { env } from '../config/env';

// ─── POST /jobs ───────────────────────────────────────────────────────────────

export async function createJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      title, description, tradeType, budgetMin, budgetMax,
      streetAddress, city, state, zipCode, urgency, clientName, clientNote,
      // New fields
      estimatedValue, serviceRadiusMiles,
      clientFirstName, clientLastName, clientEmail, clientPhone,
      clientStreetAddress, clientCity, clientState, clientZipCode, clientNotes,
    } = req.body;

    const [minBudget, maxBudget, expiryDays] = await Promise.all([
      getSetting('min_job_budget'),
      getSetting('max_job_budget'),
      getSetting('job_expiry_days'),
    ]);

    if (budgetMin < parseFloat(minBudget ?? '100')) {
      return next(new AppError(`Minimum budget is $${minBudget}`, 400));
    }
    if (budgetMax > parseFloat(maxBudget ?? '100000')) {
      return next(new AppError(`Maximum budget is $${maxBudget}`, 400));
    }

    const expiresAt = addDays(new Date(), parseInt(expiryDays ?? '30'));
    const interestWindowEnd = addHours(new Date(), 24); // 24-hour interest window

    const job = await prisma.job.create({
      data: {
        postedById: req.user!.userId,
        title, description, tradeType, budgetMin, budgetMax,
        streetAddress, city, state, zipCode, urgency,
        clientName: clientName ?? (clientFirstName ? `${clientFirstName} ${clientLastName ?? ''}`.trim() : null),
        clientNote, expiresAt,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        serviceRadiusMiles: serviceRadiusMiles ? parseInt(serviceRadiusMiles) : null,
        interestWindowEnd,
      },
      include: { postedBy: { select: { id: true, name: true, profile: { select: { avgRating: true, photoUrl: true } } } } },
    });

    // Create ClientLead if client contact info is provided
    if (clientEmail) {
      await prisma.clientLead.create({
        data: {
          jobId: job.id,
          firstName: clientFirstName ?? clientName?.split(' ')[0] ?? 'Client',
          lastName: clientLastName ?? clientName?.split(' ').slice(1).join(' ') ?? '',
          email: clientEmail,
          phone: clientPhone ?? null,
          streetAddress: clientStreetAddress ?? streetAddress,
          city: clientCity ?? city,
          state: clientState ?? state,
          zipCode: clientZipCode ?? zipCode,
          notes: clientNotes ?? null,
          tokenExpiry: addDays(new Date(), 90), // 90-day client portal access
        },
      });
    }

    // Increment referrer's total referrals
    await prisma.contractorProfile.update({
      where: { userId: req.user!.userId },
      data: { totalReferrals: { increment: 1 } },
    });

    // Admin notification
    import('../services/email.service').then(({ sendAdminNotificationEmail }) =>
      sendAdminNotificationEmail('New Job Posted', {
        Title: job.title,
        Trade: job.tradeType,
        Budget: `$${job.budgetMin} – $${job.budgetMax}`,
        'Posted By': req.user!.userId,
      }).catch(() => {})
    );

    res.status(201).json({ success: true, data: { job } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /jobs ────────────────────────────────────────────────────────────────

export async function getJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      tradeType, state, city, zipCode, budgetMin, budgetMax,
      urgency, status = 'Open', page = '1', pageSize = '20',
      nearZip, radius = '30',
    } = req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    // ─── Geo radius filtering via ZIP code database ─────────────────────
    let geoZipFilter: string[] | null = null;
    if (nearZip) {
      const { getZipsInRadius } = await import('../services/geo.service');
      geoZipFilter = getZipsInRadius(nearZip, parseFloat(radius));
      if (geoZipFilter.length === 0) {
        // No ZIP codes found in radius — return empty
        return res.json({
          success: true,
          data: { jobs: [], total: 0, page: 1, pageSize: parseInt(pageSize), totalPages: 0, nearZip, radiusMiles: parseFloat(radius) },
        });
      }
    }

    const where: any = {
      status: status as any,
      expiresAt: { gt: new Date() },
      ...(tradeType && { tradeType: tradeType as any }),
      ...(state && { state }),
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(zipCode && !nearZip && { zipCode }), // exact ZIP overridden by nearZip
      ...(geoZipFilter && { zipCode: { in: geoZipFilter } }),
      ...(budgetMin && { budgetMin: { gte: parseFloat(budgetMin) } }),
      ...(budgetMax && { budgetMax: { lte: parseFloat(budgetMax) } }),
      ...(urgency && { urgency: urgency as any }),
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          postedBy: { select: { id: true, name: true, profile: { select: { avgRating: true, photoUrl: true, tradeTypes: true } } } },
          _count: { select: { interests: true } },
        },
        orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: parseInt(pageSize),
      }),
      prisma.job.count({ where }),
    ]);

    // Attach distance to each job if geo filtering
    let enrichedJobs = jobs;
    if (nearZip) {
      const { getCoordinates, haversineDistance } = await import('../services/geo.service');
      const center = getCoordinates(nearZip);
      if (center) {
        enrichedJobs = jobs.map((job: any) => {
          const jobCoords = getCoordinates(job.zipCode);
          const dist = jobCoords
            ? haversineDistance(center.latitude, center.longitude, jobCoords.latitude, jobCoords.longitude)
            : null;
          return { ...job, _distanceMiles: dist !== null ? Math.round(dist * 10) / 10 : null };
        }).sort((a: any, b: any) => (a._distanceMiles ?? 999) - (b._distanceMiles ?? 999));
      }
    }

    res.json({
      success: true,
      data: {
        jobs: enrichedJobs, total,
        page: parseInt(page), pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
        ...(nearZip && { nearZip, radiusMiles: parseFloat(radius) }),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /jobs/my-referrals ────────────────────────────────────────────────────

export async function getMyReferrals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobs = await prisma.job.findMany({
      where: { postedById: req.user!.userId },
      include: {
        claimedBy: { select: { id: true, name: true, profile: { select: { photoUrl: true, avgRating: true } } } },
        commission: true,
        escrow: true,
        _count: { select: { interests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { jobs } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /jobs/my-claimed ──────────────────────────────────────────────────────

export async function getMyClaimed(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobs = await prisma.job.findMany({
      where: { claimedById: req.user!.userId },
      include: {
        postedBy: { select: { id: true, name: true, profile: { select: { photoUrl: true, avgRating: true } } } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { items: jobs } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /jobs/:id ─────────────────────────────────────────────────────────────

export async function getJob(req: Request, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id as string;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        postedBy: { select: { id: true, name: true, profile: { select: { avgRating: true, photoUrl: true, tradeTypes: true, city: true, state: true } } } },
        claimedBy: { select: { id: true, name: true, profile: { select: { avgRating: true, photoUrl: true } } } },
        clientLead: true,
        escrow: true,
        _count: { select: { interests: true } },
      },
    });
    if (!job) return next(new AppError('Job not found', 404));

    // Strip clientLead and clientNote unless user is poster or assigned contractor
    const userId = (req as any).user?.userId;
    const canSeeClient = userId && (userId === job.postedById || userId === job.claimedById);
    const safeJob = canSeeClient ? job : { ...job, clientLead: null, clientNote: null };

    res.json({ success: true, data: { job: safeJob } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /jobs/:id ─────────────────────────────────────────────────────────────

export async function updateJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id as string;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.postedById !== req.user!.userId) return next(new AppError('Not authorized', 403));
    if (job.status !== 'Open') return next(new AppError('Only open jobs can be edited', 400));

    const { title, description, budgetMin, budgetMax, urgency, clientName, clientNote } = req.body;
    const updated = await prisma.job.update({
      where: { id: jobId },
      data: { title, description, budgetMin, budgetMax, urgency, clientName, clientNote },
    });
    res.json({ success: true, data: { job: updated } });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /jobs/:id ──────────────────────────────────────────────────────────

export async function deleteJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id as string;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.postedById !== req.user!.userId) return next(new AppError('Not authorized', 403));
    if (job.status !== 'Open') return next(new AppError('Only open jobs can be deleted', 400));

    await prisma.job.update({ where: { id: jobId }, data: { status: 'Cancelled' } });
    await prisma.contractorProfile.update({
      where: { userId: req.user!.userId },
      data: { totalReferrals: { decrement: 1 } },
    });

    res.json({ success: true, data: { message: 'Job deleted' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /jobs/:id/claim ──────────────────────────────────────────────────────

export async function claimJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id as string;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.status !== 'Open') return next(new AppError('This job is no longer available', 400));
    if (job.postedById === req.user!.userId) return next(new AppError("You can't claim your own referral", 400));

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: { status: 'Assigned', claimedById: req.user!.userId },
    });

    // Notify referrer
    await Promise.all([
      prisma.notification.create({
        data: {
          userId: job.postedById,
          type: 'job_claimed',
          title: 'Your referral was claimed!',
          message: `Someone accepted your referral for "${job.title}". You'll earn your commission once it's completed.`,
          link: `/dashboard/my-referrals`,
        },
      }),
      prisma.user.findUnique({ where: { id: job.postedById } }).then((referrer: any) => {
        if (referrer) return sendJobClaimedEmail(referrer.email, referrer.name, job.title);
      }),
    ]);

    res.json({ success: true, data: { job: updated } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /jobs/:id/start ─────────────────────────────────────────────────────

export async function startJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id as string;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.claimedById !== req.user!.userId) return next(new AppError('Not authorized', 403));
    if (job.status !== 'Assigned' && job.status !== 'QuoteApproved') return next(new AppError('Job must be assigned or quote approved to start', 400));

    const updated = await prisma.job.update({ where: { id: jobId }, data: { status: 'InProgress' } });

    await prisma.notification.create({
      data: {
        userId: job.postedById,
        type: 'job_started',
        title: 'Job started!',
        message: `The contractor has started working on "${job.title}".`,
        link: `/dashboard/my-referrals`,
      },
    });

    // Email client that work has started
    const clientLead = await prisma.clientLead.findUnique({ where: { jobId } });
    if (clientLead?.email) {
      const contractor = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      const portalUrl = `${env.WEB_URL}/client/${clientLead.accessToken}`;
      sendClientJobInProgressEmail(
        clientLead.email, `${clientLead.firstName} ${clientLead.lastName}`,
        job.title, contractor?.name ?? 'Your contractor', portalUrl,
      ).catch(() => {});
    }

    res.json({ success: true, data: { job: updated } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /jobs/:id/complete ──────────────────────────────────────────────────

export async function completeJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id as string;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { postedBy: true },
    });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.claimedById !== req.user!.userId) return next(new AppError('Not authorized', 403));
    if (job.status !== 'InProgress') return next(new AppError('Job must be In Progress to complete', 400));

    // Update job status to ContractorDone (client has 5 days to confirm/dispute)
    const [updatedJob] = await Promise.all([
      prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'ContractorDone',
          autoReleaseAt: addDays(new Date(), 5),
        },
      }),
      prisma.contractorProfile.update({
        where: { userId: req.user!.userId },
        data: { totalJobsCompleted: { increment: 1 } },
      }),
    ]);

    // Get commission pct for email
    const commissionPct = await getSetting('commission_pct');
    const commissionAmount = (job.budgetMax * parseFloat(commissionPct ?? '20')) / 100;

    await Promise.all([
      prisma.notification.create({
        data: {
          userId: job.postedById,
          type: 'job_completed',
          title: 'Job completed! Commission incoming 🎉',
          message: `"${job.title}" is complete. Your $${commissionAmount.toFixed(2)} commission is being processed.`,
          link: `/dashboard/earnings`,
        },
      }),
      sendJobCompletedEmail(job.postedBy.email, job.postedBy.name, job.title, commissionAmount.toFixed(2)),
    ]);

    // Email client that contractor marked done
    const clientLead = await prisma.clientLead.findUnique({ where: { jobId } });
    if (clientLead?.email) {
      const portalUrl = `${env.WEB_URL}/client/${clientLead.accessToken}`;
      sendClientContractorDoneEmail(
        clientLead.email, `${clientLead.firstName} ${clientLead.lastName}`,
        job.title, portalUrl,
      ).catch(() => {});
    }

    res.json({ success: true, data: { job: updatedJob, message: 'Job marked as complete. Payment processing initiated via job payment flow.' } });
  } catch (err) {
    next(err);
  }
}
