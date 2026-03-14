import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// ─── GET /admin/disputes ────────────────────────────────────────────────────
// Admin views all disputes

export async function getDisputes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, page = '1', pageSize = '20' } = req.query as Record<string, string>;

    const where: any = {};
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          job: {
            select: {
              id: true, title: true, status: true,
              postedBy: { select: { id: true, name: true } },
              claimedBy: { select: { id: true, name: true } },
              escrow: { select: { id: true, status: true, totalAmount: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(pageSize),
      }),
      prisma.dispute.count({ where }),
    ]);

    res.json({ success: true, data: { disputes, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(pageSize)) } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/disputes/:id ────────────────────────────────────────────────

export async function getDisputeDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const disputeId = req.params.id;

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        job: {
          include: {
            postedBy: { select: { id: true, name: true, email: true } },
            claimedBy: { select: { id: true, name: true, email: true } },
            clientLead: { select: { firstName: true, lastName: true, email: true, phone: true } },
            escrow: true,
            quotes: { orderBy: { createdAt: 'desc' }, take: 1 },
            messages: { orderBy: { createdAt: 'desc' }, take: 20 },
          },
        },
      },
    });
    if (!dispute) return next(new AppError('Dispute not found', 404));

    res.json({ success: true, data: { dispute } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /admin/disputes/:id/resolve ───────────────────────────────────────

export async function resolveDispute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const disputeId = req.params.id;
    const { resolution, adminNotes, addStrike } = req.body;
    // resolution: "contractor" | "client"

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        job: { include: { escrow: true, claimedBy: true, postedBy: true } },
      },
    });
    if (!dispute) return next(new AppError('Dispute not found', 404));
    if (dispute.status !== 'open' && dispute.status !== 'under_review') {
      return next(new AppError('Dispute is already resolved', 400));
    }

    const resolvedStatus = resolution === 'contractor' ? 'resolved_contractor' : 'resolved_client';

    // Update dispute
    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: resolvedStatus as any,
        adminNotes,
        resolvedBy: req.user!.userId,
        resolvedAt: new Date(),
      },
    });

    // Handle escrow based on resolution
    if (dispute.job.escrow) {
      if (resolution === 'contractor') {
        // Release funds to contractor — full distribution
        await prisma.$transaction([
          prisma.escrowPayment.update({
            where: { id: dispute.job.escrow.id },
            data: { status: 'released', releasedAt: new Date() },
          }),
          prisma.job.update({
            where: { id: dispute.jobId },
            data: { status: 'Completed' },
          }),
          // Create commission record for referee
          prisma.commission.create({
            data: {
              jobId: dispute.jobId,
              referrerId: dispute.job.postedById,
              amount: dispute.job.escrow.commissionAmount,
              status: 'paid',
              paidAt: new Date(),
            },
          }),
          // Update contractor earnings + job count
          ...(dispute.job.claimedById ? [
            prisma.contractorProfile.update({
              where: { userId: dispute.job.claimedById },
              data: {
                totalEarned: { increment: dispute.job.escrow!.contractorAmount },
                totalJobsCompleted: { increment: 1 },
              },
            }),
          ] : []),
          // Update referee earnings
          prisma.contractorProfile.update({
            where: { userId: dispute.job.postedById },
            data: { totalEarned: { increment: dispute.job.escrow!.commissionAmount } },
          }),
        ]);
      } else {
        // Refund to client
        await prisma.escrowPayment.update({
          where: { id: dispute.job.escrow.id },
          data: { status: 'refunded' },
        });
        await prisma.job.update({
          where: { id: dispute.jobId },
          data: { status: 'Cancelled' },
        });
      }
    }

    // Add strike if requested
    if (addStrike && dispute.job.claimedById) {
      await prisma.contractorStrike.create({
        data: {
          contractorId: dispute.job.claimedById,
          type: 'client_report',
          jobId: dispute.jobId,
          reason: `Dispute resolved in client's favor: ${adminNotes}`,
          isWarning: false,
        },
      });

      // Check strike count for escalation
      const strikeCount = await prisma.contractorStrike.count({
        where: { contractorId: dispute.job.claimedById, isWarning: false },
      });

      if (strikeCount >= 3) {
        await prisma.contractorProfile.update({
          where: { userId: dispute.job.claimedById },
          data: { isSuspended: true, suspendedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // 30 day suspension
        });
      }
    }

    // Notify both parties
    const notifications = [];
    if (dispute.job.claimedById) {
      notifications.push({
        userId: dispute.job.claimedById,
        type: 'dispute_resolved' as const,
        title: `Dispute resolved ${resolution === 'contractor' ? 'in your favor ✅' : 'in client\'s favor'}`,
        message: `The dispute on "${dispute.job.title}" has been resolved. ${resolution === 'contractor' ? 'Funds will be released.' : 'Funds will be refunded.'}`,
        link: `/dashboard/jobs/${dispute.jobId}`,
      });
    }
    notifications.push({
      userId: dispute.job.postedById,
      type: 'dispute_resolved' as const,
      title: 'Dispute resolved',
      message: `The dispute on "${dispute.job.title}" has been resolved in ${resolution === 'contractor' ? 'contractor\'s' : 'client\'s'} favor.`,
      link: `/dashboard/my-referrals`,
    });

    await prisma.notification.createMany({ data: notifications });

    res.json({ success: true, data: { message: `Dispute resolved in ${resolution}'s favor` } });
  } catch (err) {
    next(err);
  }
}
