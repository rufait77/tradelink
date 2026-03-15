// @ts-nocheck
import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { differenceInDays } from 'date-fns';

// ─── POST /reviews ─────────────────────────────────────────────────────────────

export async function createReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { jobId, revieweeId, rating, text, dimension } = req.body;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (!['Completed', 'ClientConfirmed', 'ContractorDone'].includes(job.status)) {
      return next(new AppError('Reviews can only be submitted for completed jobs', 400));
    }

    // Only poster or hired contractor can review
    const isInvolved = job.postedById === req.user!.userId || job.claimedById === req.user!.userId;
    if (!isInvolved) return next(new AppError('Not authorized to review this job', 403));

    // Can only review the other party
    const validReviewee =
      (req.user!.userId === job.postedById && revieweeId === job.claimedById) ||
      (req.user!.userId === job.claimedById && revieweeId === job.postedById);
    if (!validReviewee) return next(new AppError('You can only review the other party', 400));

    // 30-day review window
    if (differenceInDays(new Date(), job.updatedAt) > 30) {
      return next(new AppError('Review window has closed (30 days after job completion)', 400));
    }

    // One review per direction per job
    const existing = await prisma.review.findFirst({
      where: { jobId, reviewerId: req.user!.userId, revieweeId },
    });
    if (existing) return next(new AppError('You have already submitted a review for this job', 409));

    const review = await prisma.review.create({
      data: {
        jobId, reviewerId: req.user!.userId, revieweeId, rating, text: text || '',
        dimension: dimension || 'general',
      },
    });

    // Recalculate reviewee's average rating
    const aggr = await prisma.review.aggregate({
      where: { revieweeId, isFlagged: false },
      _avg: { rating: true },
    });

    // 7E: Calculate dimension-specific ratings
    const dimRatings: any = { avgRating: aggr._avg.rating ?? 0 };
    const dimensions = ['client_facing', 'job_quality', 'referral_quality'];
    const dimFields: Record<string, string> = {
      client_facing: 'clientFacingRating',
      job_quality: 'jobQualityRating',
      referral_quality: 'referralQualityRating',
    };
    for (const dim of dimensions) {
      const dimAggr = await prisma.review.aggregate({
        where: { revieweeId, dimension: dim, isFlagged: false },
        _avg: { rating: true },
      });
      if (dimAggr._avg.rating !== null) {
        dimRatings[dimFields[dim]] = dimAggr._avg.rating;
      }
    }
    await prisma.contractorProfile.update({
      where: { userId: revieweeId },
      data: dimRatings,
    });

    // In-app notification to reviewee
    await prisma.notification.create({
      data: {
        userId: revieweeId,
        type: 'review_received',
        title: 'You received a new review!',
        message: `Someone left you a ${rating}-star review.`,
        link: `/contractors/${revieweeId}`,
      },
    });

    res.status(201).json({ success: true, data: { review } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /reviews/my-review/:jobId ──────────────────────────────────────────

export async function getMyReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.jobId as string;
    const review = await prisma.review.findFirst({
      where: { jobId, reviewerId: req.user!.userId },
    });
    res.json({ success: true, data: { review } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /commissions ─────────────────────────────────────────────────────────

export async function getMyCommissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string ?? '1');
    const pageSize = 20;

    const [items, total] = await Promise.all([
      prisma.commission.findMany({
        where: { referrerId: req.user!.userId },
        include: { job: { select: { id: true, title: true, status: true, tradeType: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.commission.count({ where: { referrerId: req.user!.userId } }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /earnings/summary ────────────────────────────────────────────────────

export async function getEarningsSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [profile, paidTotal, pendingTotal, thisMonth] = await Promise.all([
      prisma.contractorProfile.findUnique({ where: { userId } }),
      prisma.commission.aggregate({
        where: { referrerId: userId, status: 'paid' },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: { referrerId: userId, status: 'pending' },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: { referrerId: userId, status: 'paid', paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalEarned: paidTotal._sum.amount ?? 0,
        pending: pendingTotal._sum.amount ?? 0,
        thisMonth: thisMonth._sum.amount ?? 0,
        totalReferrals: profile?.totalReferrals ?? 0,
        totalJobsCompleted: profile?.totalJobsCompleted ?? 0,
        avgRating: profile?.avgRating ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /messages/conversations ─────────────────────────────────────────────

export async function getConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    // Get unique job threads this user is involved in
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      distinct: ['jobId'],
      include: {
        job: { select: { id: true, title: true, status: true } },
        sender: { select: { id: true, name: true, profile: { select: { photoUrl: true } } } },
        receiver: { select: { id: true, name: true, profile: { select: { photoUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Attach unread count per thread
    const threads = await Promise.all(
      messages.map(async (msg: any) => {
        const unread = await prisma.message.count({
          where: { jobId: msg.jobId, receiverId: userId, isRead: false },
        });
        return { ...msg, unreadCount: unread };
      })
    );

    res.json({ success: true, data: { conversations: threads } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /messages/:jobId ─────────────────────────────────────────────────────

export async function getMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.jobId as string;
    const userId = req.user!.userId;

    // Verify user is involved in the job
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.postedById !== userId && job.claimedById !== userId) {
      return next(new AppError('Not authorized', 403));
    }
    if (!job.claimedById) {
      return next(new AppError('Messaging is available after the job is claimed', 400));
    }

    const messages = await prisma.message.findMany({
      where: { jobId },
      include: { sender: { select: { id: true, name: true, profile: { select: { photoUrl: true } } } } },
      orderBy: { createdAt: 'asc' },
    });

    // Mark received messages as read
    await prisma.message.updateMany({
      where: { jobId, receiverId: userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, data: { messages, job: { id: job.id, title: job.title, status: job.status } } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /messages ───────────────────────────────────────────────────────────

export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { receiverId, jobId, content } = req.body;
    const senderId = req.user!.userId;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (!job.claimedById) return next(new AppError('Messaging unlocked only after job is claimed', 400));
    if (job.postedById !== senderId && job.claimedById !== senderId) {
      return next(new AppError('Not authorized', 403));
    }

    const message = await prisma.message.create({
      data: { senderId, receiverId, jobId, content },
      include: { sender: { select: { id: true, name: true, profile: { select: { photoUrl: true } } } } },
    });

    // In-app notification
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'message_received',
        title: 'New message',
        message: `You have a new message about "${job.title}"`,
        link: `/dashboard/messages`,
      },
    });

    res.status(201).json({ success: true, data: { message } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /messages/:jobId/read ────────────────────────────────────────────────

export async function markThreadRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.jobId as string;
    const userId = req.user!.userId;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.postedById !== userId && job.claimedById !== userId) {
      return next(new AppError('Not authorized', 403));
    }

    const updated = await prisma.message.updateMany({
      where: { jobId, receiverId: userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, data: { message: `${updated.count} messages marked as read` } });
  } catch (err) {
    next(err);
  }
}
