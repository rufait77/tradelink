// @ts-nocheck
import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { addDays } from 'date-fns';

// ─── POST /escrow/create ────────────────────────────────────────────────────
// Creates an escrow payment entry after client approves a quote
// Called internally after quote approval or by contractor

export async function createEscrow(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { quoteId } = req.body;

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { job: { include: { clientLead: true, escrow: true } } },
    });
    if (!quote) return next(new AppError('Quote not found', 404));
    if (quote.status !== 'approved') return next(new AppError('Quote must be approved before creating escrow', 400));
    if (quote.job.escrow) return next(new AppError('Escrow already exists for this job', 400));

    // Calculate splits
    const totalAmount = quote.amount;
    const platformFeeAmount = (totalAmount * quote.platformFeePct) / 100;
    const commissionAmount = (totalAmount * quote.commissionPct) / 100;
    const contractorAmount = totalAmount - platformFeeAmount - commissionAmount;

    // Create escrow record
    const escrow = await prisma.escrowPayment.create({
      data: {
        jobId: quote.jobId,
        quoteId: quote.id,
        totalAmount,
        platformFeeAmount,
        commissionAmount,
        contractorAmount,
        status: 'pending',
        // TODO: Create Stripe Checkout Session and store paymentLink + stripeCheckoutId
      },
    });

    // Update job status
    await prisma.job.update({
      where: { id: quote.jobId },
      data: { status: 'QuoteApproved' }, // stays here until payment completes
    });

    // TODO: Phase 2H — sendClientPaymentEmail(clientLead, escrow)

    res.status(201).json({
      success: true,
      data: {
        escrow,
        splitBreakdown: {
          total: totalAmount,
          contractorPayout: contractorAmount,
          referralFee: commissionAmount,
          platformFee: platformFeeAmount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /escrow/:id/release ───────────────────────────────────────────────
// Releases escrow funds after client confirmation or auto-release timer
// Distributes: contractor payout + referral commission + platform fee

export async function releaseEscrow(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const escrowId = req.params.id;

    const escrow = await prisma.escrowPayment.findUnique({
      where: { id: escrowId },
      include: {
        job: {
          include: {
            postedBy: { select: { id: true, name: true, email: true, stripeConnectId: true } },
            claimedBy: { select: { id: true, name: true, email: true, stripeConnectId: true } },
          },
        },
        quote: true,
      },
    });
    if (!escrow) return next(new AppError('Escrow not found', 404));
    if (escrow.status !== 'funded') return next(new AppError('Escrow must be funded to release', 400));

    const job = escrow.job;

    // TODO: Execute actual Stripe transfers:
    // 1. Transfer contractorAmount to contractor's Stripe Connect account
    // 2. Transfer commissionAmount to referee's Stripe Connect account
    // 3. Platform fee stays in platform Stripe account

    // Mark as released
    await prisma.$transaction([
      prisma.escrowPayment.update({
        where: { id: escrowId },
        data: { status: 'released', releasedAt: new Date() },
      }),
      prisma.job.update({
        where: { id: job.id },
        data: { status: 'Completed' },
      }),
      // Create commission record
      prisma.commission.create({
        data: {
          jobId: job.id,
          referrerId: job.postedById,
          amount: escrow.commissionAmount,
          status: 'paid',
          paidAt: new Date(),
        },
      }),
      // Update contractor stats
      prisma.contractorProfile.update({
        where: { userId: job.claimedById! },
        data: {
          totalEarned: { increment: escrow.contractorAmount },
          totalJobsCompleted: { increment: 1 },
        },
      }),
      // Update referee stats
      prisma.contractorProfile.update({
        where: { userId: job.postedById },
        data: { totalEarned: { increment: escrow.commissionAmount } },
      }),
    ]);

    // Notify contractor and referee
    await prisma.notification.createMany({
      data: [
        {
          userId: job.claimedById!,
          type: 'funds_released',
          title: 'Payment released! 💰',
          message: `$${escrow.contractorAmount.toFixed(2)} has been released for "${job.title}".`,
          link: `/dashboard/earnings`,
        },
        {
          userId: job.postedById,
          type: 'funds_released',
          title: 'Commission paid! 💰',
          message: `$${escrow.commissionAmount.toFixed(2)} commission released for your referral "${job.title}".`,
          link: `/dashboard/earnings`,
        },
      ],
    });

    // Send rating prompts
    await prisma.notification.createMany({
      data: [
        {
          userId: job.claimedById!,
          type: 'review_prompt',
          title: 'Rate the referral quality',
          message: `How was the referral for "${job.title}"? Leave a review for ${job.postedBy.name}.`,
          link: `/dashboard/jobs/${job.id}`,
        },
        {
          userId: job.postedById,
          type: 'review_prompt',
          title: 'Rate the contractor',
          message: `How did the contractor perform on "${job.title}"? Leave a review.`,
          link: `/dashboard/my-referrals`,
        },
      ],
    });

    res.json({ success: true, data: { escrow: { ...escrow, status: 'released', releasedAt: new Date() } } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /escrow/:id/refund ────────────────────────────────────────────────
// Refunds escrow to client (dispute resolved in client's favor)

export async function refundEscrow(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const escrowId = req.params.id;

    const escrow = await prisma.escrowPayment.findUnique({
      where: { id: escrowId },
      include: { job: true },
    });
    if (!escrow) return next(new AppError('Escrow not found', 404));
    if (escrow.status !== 'funded' && escrow.status !== 'disputed') {
      return next(new AppError('Escrow must be funded or disputed to refund', 400));
    }

    // TODO: Execute Stripe refund

    await prisma.escrowPayment.update({
      where: { id: escrowId },
      data: { status: 'refunded' },
    });

    res.json({ success: true, data: { message: 'Escrow refunded to client' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /jobs/:id/contractor-complete ──────────────────────────────────────
// Contractor marks job as done (with photos + notes)

export async function contractorCompleteJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id;
    const contractorId = req.user!.userId;
    const { completionNotes, completionPhotos } = req.body;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { clientLead: true },
    });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.claimedById !== contractorId) return next(new AppError('Not authorized', 403));
    if (job.status !== 'InProgress') return next(new AppError('Job must be in progress to mark as complete', 400));

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'ContractorDone',
        contractorCompletedAt: new Date(),
        autoReleaseAt: addDays(new Date(), 5), // auto-release in 5 days if client doesn't confirm
        completionNotes: completionNotes ?? null,
        completionPhotos: completionPhotos ?? [],
      },
    });

    // Notify referee
    await prisma.notification.create({
      data: {
        userId: job.postedById,
        type: 'contractor_completed',
        title: 'Contractor marked job as done!',
        message: `The contractor marked "${job.title}" as complete. Client has been notified to confirm.`,
        link: `/dashboard/my-referrals`,
      },
    });

    // TODO: Phase 2H — sendClientCompletionEmail(clientLead, job)

    res.json({ success: true, data: { job: updated } });
  } catch (err) {
    next(err);
  }
}
