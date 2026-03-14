// @ts-nocheck
import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { addHours } from 'date-fns';

// ─── POST /jobs/:id/interest ─────────────────────────────────────────────────
// Contractor expresses interest in a referral

export async function expressInterest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id;
    const contractorId = req.user!.userId;
    const { message } = req.body; // optional pitch

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.postedById === contractorId) return next(new AppError("You can't express interest in your own referral", 400));

    // Only allow interest if job is Open or InterestClosed (referee still reviewing)
    if (job.status !== 'Open' && job.status !== 'InterestClosed') {
      return next(new AppError('This job is no longer accepting interest', 400));
    }

    // Check interest window
    if (job.interestWindowEnd && new Date() > job.interestWindowEnd) {
      // Window closed but status not yet updated — still allow if referee hasn't picked yet
      if (job.status === 'Open') {
        await prisma.job.update({ where: { id: jobId }, data: { status: 'InterestClosed' } });
      }
    }

    // Check for existing interest
    const existing = await prisma.jobInterest.findUnique({
      where: { jobId_contractorId: { jobId, contractorId } },
    });
    if (existing) return next(new AppError('You have already expressed interest in this job', 400));

    // Create interest
    const interest = await prisma.jobInterest.create({
      data: { jobId, contractorId, message },
      include: {
        contractor: {
          select: { id: true, name: true, profile: { select: { avgRating: true, photoUrl: true, totalJobsCompleted: true, avgResponseTime: true, tradeTypes: true } } },
        },
      },
    });

    // Notify referee (poster)
    const interestCount = await prisma.jobInterest.count({ where: { jobId, status: 'pending' } });
    await prisma.notification.create({
      data: {
        userId: job.postedById,
        type: 'interest_received',
        title: 'New interest in your referral!',
        message: `${interest.contractor.name} expressed interest in "${job.title}". ${interestCount} contractor${interestCount > 1 ? 's' : ''} interested so far.`,
        link: `/dashboard/my-referrals`,
      },
    });

    res.status(201).json({ success: true, data: { interest } });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /jobs/:id/interest ────────────────────────────────────────────────
// Contractor withdraws interest

export async function withdrawInterest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id;
    const contractorId = req.user!.userId;

    const interest = await prisma.jobInterest.findUnique({
      where: { jobId_contractorId: { jobId, contractorId } },
    });
    if (!interest) return next(new AppError('No interest found to withdraw', 404));
    if (interest.status !== 'pending') return next(new AppError('Cannot withdraw — interest already processed', 400));

    await prisma.jobInterest.update({
      where: { id: interest.id },
      data: { status: 'withdrawn' },
    });

    res.json({ success: true, data: { message: 'Interest withdrawn' } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /jobs/:id/interests ─────────────────────────────────────────────────
// Referee (poster) views all interested contractors

export async function getInterests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.postedById !== req.user!.userId) return next(new AppError('Only the referee can view interests', 403));

    const interests = await prisma.jobInterest.findMany({
      where: { jobId, status: 'pending' },
      include: {
        contractor: {
          select: {
            id: true, name: true,
            profile: {
              select: {
                avgRating: true, photoUrl: true, totalJobsCompleted: true,
                avgResponseTime: true, tradeTypes: true, bio: true,
                yearsExperience: true, city: true, state: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const count = await prisma.jobInterest.count({ where: { jobId, status: 'pending' } });

    res.json({ success: true, data: { interests, count } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /jobs/:id/assign/:contractorId ─────────────────────────────────────
// Referee selects a contractor from the interest list

export async function assignContractor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id: jobId, contractorId } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { clientLead: true },
    });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.postedById !== req.user!.userId) return next(new AppError('Only the referee can assign contractors', 403));
    if (job.status !== 'Open' && job.status !== 'InterestClosed') {
      return next(new AppError('Job is not in a state that allows assignment', 400));
    }

    // Verify the contractor expressed interest
    const interest = await prisma.jobInterest.findUnique({
      where: { jobId_contractorId: { jobId, contractorId } },
    });
    if (!interest || interest.status !== 'pending') {
      return next(new AppError('This contractor has not expressed interest or was already processed', 400));
    }

    // Transaction: assign job, update interests, notify everyone
    const [updatedJob] = await prisma.$transaction([
      // 1. Assign the job
      prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'Assigned',
          claimedById: contractorId,
          assignedAt: new Date(),
        },
        include: {
          claimedBy: { select: { id: true, name: true, email: true, profile: { select: { photoUrl: true, avgRating: true } } } },
          postedBy: { select: { id: true, name: true, email: true } },
          clientLead: true,
        },
      }),
      // 2. Mark the selected contractor's interest as selected
      prisma.jobInterest.update({
        where: { id: interest.id },
        data: { status: 'selected' },
      }),
      // 3. Reject all other pending interests
      prisma.jobInterest.updateMany({
        where: { jobId, status: 'pending', NOT: { id: interest.id } },
        data: { status: 'rejected' },
      }),
    ]);

    // 4. Notify selected contractor
    await prisma.notification.create({
      data: {
        userId: contractorId,
        type: 'job_assigned',
        title: `You've been assigned a job! 🎉`,
        message: `You've been assigned "${job.title}" by ${updatedJob.postedBy.name}. Create a quote and reach out to the client.`,
        link: `/dashboard/jobs/${jobId}`,
      },
    });

    // 5. Notify rejected contractors
    const rejectedInterests = await prisma.jobInterest.findMany({
      where: { jobId, status: 'rejected' },
      select: { contractorId: true },
    });
    if (rejectedInterests.length > 0) {
      await prisma.notification.createMany({
        data: rejectedInterests.map((ri) => ({
          userId: ri.contractorId,
          type: 'interest_rejected' as const,
          title: 'Referral assigned to another contractor',
          message: `The referral "${job.title}" has been assigned to another contractor. Keep an eye out for new listings!`,
          link: '/dashboard/jobs',
        })),
      });
    }

    // 6. Send email to client (if client lead exists)
    // TODO: Phase 2H — sendClientAssignmentEmail

    res.json({ success: true, data: { job: updatedJob } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /jobs/:id/reassign ─────────────────────────────────────────────────
// Referee re-opens job after ghost/cancelled assignment

export async function reassignJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id;
    const { action } = req.body; // "reopen" or "mark_dead"

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.postedById !== req.user!.userId) return next(new AppError('Only the referee can reassign', 403));

    if (action === 'mark_dead') {
      await prisma.job.update({ where: { id: jobId }, data: { status: 'Cancelled' } });
      return res.json({ success: true, data: { message: 'Referral marked as dead' } });
    }

    if (action === 'reopen') {
      // Re-open with a fresh 24-hour interest window
      const updated = await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'Open',
          claimedById: null,
          assignedAt: null,
          interestWindowEnd: addHours(new Date(), 24),
        },
      });

      return res.json({ success: true, data: { job: updated, message: 'Referral re-opened for new interests' } });
    }

    return next(new AppError('Invalid action. Use "reopen" or "mark_dead"', 400));
  } catch (err) {
    next(err);
  }
}

// ─── GET /jobs/:id/my-interest ───────────────────────────────────────────────
// Check if current user has expressed interest in a job

export async function getMyInterest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id;
    const contractorId = req.user!.userId;

    const interest = await prisma.jobInterest.findUnique({
      where: { jobId_contractorId: { jobId, contractorId } },
    });

    res.json({ success: true, data: { interest } });
  } catch (err) {
    next(err);
  }
}
