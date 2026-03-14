// @ts-nocheck
import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { ClientRequest } from '../middleware/clientAuth';

// ─── GET /client/:token ─────────────────────────────────────────────────────
// Client dashboard — overview of job status, assigned contractor, current quote

export async function getClientDashboard(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const lead = req.clientLead;
    const job = req.clientJob;

    // Build a safe view of the contractor (no internal IDs shown to client)
    const contractor = job.claimedBy ? {
      name: job.claimedBy.name,
      photoUrl: job.claimedBy.profile?.photoUrl,
      avgRating: job.claimedBy.profile?.avgRating,
      tradeTypes: job.claimedBy.profile?.tradeTypes,
      bio: job.claimedBy.profile?.bio,
      yearsExperience: job.claimedBy.profile?.yearsExperience,
      totalJobsCompleted: job.claimedBy.profile?.totalJobsCompleted,
      city: job.claimedBy.profile?.city,
      state: job.claimedBy.profile?.state,
      isVerified: job.claimedBy.profile?.isAdminVerified,
      licenseNumber: job.claimedBy.profile?.licenseNumber,
      hasInsurance: !!job.claimedBy.profile?.insuranceUrl,
    } : null;

    const activeQuote = job.quotes?.[0] ?? null;
    const escrow = job.escrow ?? null;

    res.json({
      success: true,
      data: {
        clientName: `${lead.firstName} ${lead.lastName}`,
        job: {
          title: job.title,
          description: job.description,
          tradeType: job.tradeType,
          status: job.status,
          budgetMin: job.budgetMin,
          budgetMax: job.budgetMax,
        },
        contractor,
        activeQuote: activeQuote ? {
          id: activeQuote.id,
          amount: activeQuote.amount,
          scope: activeQuote.scope,
          scheduledDate: activeQuote.scheduledDate,
          status: activeQuote.status,
        } : null,
        escrow: escrow ? {
          status: escrow.status,
          totalAmount: escrow.totalAmount,
          paidAt: escrow.paidAt,
        } : null,
        referee: {
          name: job.postedBy.name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /client/:token/quote/:quoteId/approve ────────────────────────────
// Client approves a quote

export async function approveQuote(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const { quoteId } = req.params;
    const job = req.clientJob;

    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) return next(new AppError('Quote not found', 404));
    if (quote.jobId !== job.id) return next(new AppError('Quote does not belong to this job', 400));
    if (quote.status !== 'sent') return next(new AppError('Quote is not in a state that can be approved', 400));

    // Transaction: approve quote + update job status
    await prisma.$transaction([
      prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'approved' },
      }),
      prisma.job.update({
        where: { id: job.id },
        data: { status: 'QuoteApproved' },
      }),
    ]);

    // Notify contractor and referee
    await prisma.notification.createMany({
      data: [
        {
          userId: quote.contractorId,
          type: 'quote_approved',
          title: 'Quote approved! 🎉',
          message: `The client approved your quote of $${quote.amount.toFixed(2)} for "${job.title}". Payment link has been sent.`,
          link: `/dashboard/jobs/${job.id}`,
        },
        {
          userId: job.postedById,
          type: 'quote_approved',
          title: 'Client approved the quote!',
          message: `The client approved the $${quote.amount.toFixed(2)} quote for "${job.title}". Escrow payment is being set up.`,
          link: `/dashboard/my-referrals`,
        },
      ],
    });

    // TODO: Phase 2D — create escrow payment and send payment link to client

    res.json({ success: true, data: { message: 'Quote approved. You will receive a payment link shortly.' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /client/:token/quote/:quoteId/reject ─────────────────────────────
// Client rejects a quote (with optional reason)

export async function rejectQuote(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const { quoteId } = req.params;
    const { reason } = req.body;
    const job = req.clientJob;

    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) return next(new AppError('Quote not found', 404));
    if (quote.jobId !== job.id) return next(new AppError('Quote does not belong to this job', 400));
    if (quote.status !== 'sent') return next(new AppError('Quote is not in a state that can be rejected', 400));

    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'rejected', rejectionNote: reason ?? null },
    });

    // Notify contractor
    await prisma.notification.create({
      data: {
        userId: quote.contractorId,
        type: 'quote_rejected',
        title: 'Quote rejected by client',
        message: `The client rejected your quote for "${job.title}".${reason ? ` Reason: "${reason}"` : ''} You can submit a revised quote.`,
        link: `/dashboard/jobs/${job.id}`,
      },
    });

    res.json({ success: true, data: { message: 'Quote rejected. The contractor has been notified and may submit a revision.' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /client/:token/confirm ────────────────────────────────────────────
// Client confirms job completion

export async function confirmCompletion(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const { rating, comment } = req.body; // optional inline rating
    const job = req.clientJob;

    if (job.status !== 'ContractorDone') {
      return next(new AppError('Job must be marked as done by the contractor before you can confirm', 400));
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'ClientConfirmed',
        clientConfirmedAt: new Date(),
      },
    });

    // Notify contractor and referee
    await prisma.notification.createMany({
      data: [
        {
          userId: job.claimedById!,
          type: 'client_confirmed',
          title: 'Client confirmed completion! 🎉',
          message: `The client confirmed that "${job.title}" is complete. Your payment is being processed.`,
          link: `/dashboard/jobs/${job.id}`,
        },
        {
          userId: job.postedById,
          type: 'client_confirmed',
          title: 'Client confirmed — funds releasing!',
          message: `The client confirmed "${job.title}" is complete. Commission payout is being processed.`,
          link: `/dashboard/earnings`,
        },
      ],
    });

    // TODO: Phase 2D — trigger escrow release

    res.json({ success: true, data: { message: 'Thank you for confirming! The contractor will be paid and you can leave a rating.' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /client/:token/dispute ────────────────────────────────────────────
// Client raises a dispute

export async function raiseDispute(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const { reason, evidence } = req.body;
    const job = req.clientJob;

    // Can only dispute if job is in certain states
    const disputeableStatuses = ['InProgress', 'ContractorDone', 'EscrowFunded'];
    if (!disputeableStatuses.includes(job.status)) {
      return next(new AppError('Cannot dispute a job in its current status', 400));
    }

    const dispute = await prisma.dispute.create({
      data: {
        jobId: job.id,
        raisedBy: 'client',
        reason,
        evidence: evidence ? JSON.stringify(evidence) : null,
      },
    });

    // Update job status
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'Disputed' },
    });

    // Freeze escrow if exists
    if (job.escrow && job.escrow.status === 'funded') {
      await prisma.escrowPayment.update({
        where: { id: job.escrow.id },
        data: { status: 'disputed' },
      });
    }

    // Notify contractor and referee
    const notifications = [
      {
        userId: job.postedById,
        type: 'dispute_raised' as const,
        title: 'Dispute raised on your referral',
        message: `The client has raised a dispute on "${job.title}". An admin will review this.`,
        link: `/dashboard/my-referrals`,
      },
    ];

    if (job.claimedById) {
      notifications.push({
        userId: job.claimedById,
        type: 'dispute_raised' as const,
        title: '⚠️ Dispute raised on your job',
        message: `The client has raised a dispute on "${job.title}". Escrow funds are frozen until resolution.`,
        link: `/dashboard/jobs/${job.id}`,
      });
    }

    await prisma.notification.createMany({ data: notifications });

    res.status(201).json({ success: true, data: { dispute, message: 'Dispute filed. An admin will review your case within 48 hours.' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /client/:token/rate ───────────────────────────────────────────────
// Client rates the contractor (client-facing dimension)

export async function rateContractor(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const { rating, text } = req.body;
    const job = req.clientJob;
    const lead = req.clientLead;

    if (job.status !== 'ClientConfirmed' && job.status !== 'Completed') {
      return next(new AppError('Job must be completed before you can rate', 400));
    }

    if (!rating || rating < 1 || rating > 5) {
      return next(new AppError('Rating must be between 1 and 5', 400));
    }

    if (!job.claimedById) {
      return next(new AppError('No contractor assigned to rate', 400));
    }

    // Use the lead ID as a pseudo-reviewer since clients don't have user accounts
    // We store the review with the referee as reviewer but dimension = "client_facing"
    const review = await prisma.review.create({
      data: {
        jobId: job.id,
        reviewerId: job.postedById, // stored under referee, tagged as client-facing
        revieweeId: job.claimedById,
        rating: parseInt(rating),
        text: text ?? `Rating from client ${lead.firstName} ${lead.lastName}`,
        dimension: 'client_facing',
      },
    });

    // Recalculate contractor's avg rating
    const allReviews = await prisma.review.findMany({
      where: { revieweeId: job.claimedById },
      select: { rating: true },
    });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.contractorProfile.update({
      where: { userId: job.claimedById },
      data: { avgRating },
    });

    // Notify contractor
    await prisma.notification.create({
      data: {
        userId: job.claimedById,
        type: 'review_received',
        title: `New ${rating}★ client review!`,
        message: `You received a ${rating}-star review from the client on "${job.title}".`,
        link: `/dashboard/jobs/${job.id}`,
      },
    });

    res.json({ success: true, data: { review } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /client/:token/report ──────────────────────────────────────────────
// Client reports an issue (contractor not responding, etc.)

export async function reportIssue(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const { type, description } = req.body; // type: "not_responding" | "poor_quality" | "other"
    const job = req.clientJob;

    // Create a dispute with the issue type
    const dispute = await prisma.dispute.create({
      data: {
        jobId: job.id,
        raisedBy: 'client',
        reason: `[${type}] ${description}`,
      },
    });

    // If contractor is not responding, add a ghost warning
    if (type === 'not_responding' && job.claimedById) {
      await prisma.notification.create({
        data: {
          userId: job.claimedById,
          type: 'ghost_warning',
          title: '⚠️ Client reported no response',
          message: `The client for "${job.title}" reported that you are not responding. Please contact them immediately or risk a strike.`,
          link: `/dashboard/jobs/${job.id}`,
        },
      });
    }

    res.json({ success: true, data: { dispute, message: 'Report submitted. We will look into this within 24 hours.' } });
  } catch (err) {
    next(err);
  }
}
