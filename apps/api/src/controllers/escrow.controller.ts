// @ts-nocheck
import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { addDays } from 'date-fns';
import { isDeveloperMode } from '../services/settings.service';
import { commissionQueue } from './payments.controller';
import { logger } from '../config/logger';

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

    const devMode = await isDeveloperMode();

    let checkoutUrl: string | null = null;
    let stripeCheckoutId: string | null = null;

    if (!devMode) {
      // ─── Stripe Checkout Session ──────────────────────────────────────
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(totalAmount * 100),
              product_data: {
                name: `Escrow Payment: ${quote.job.title}`,
                description: `Contractor quote for "${quote.job.title}" — funds held in escrow until job completion.`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          type: 'escrow_payment',
          jobId: quote.jobId,
          quoteId: quote.id,
        },
        success_url: `${env.WEB_URL}/client/${quote.job.clientLead?.accessToken || 'unknown'}?payment=success`,
        cancel_url: `${env.WEB_URL}/client/${quote.job.clientLead?.accessToken || 'unknown'}?payment=cancelled`,
        expires_after: 24 * 60 * 60 , // 24 hours
      });

      checkoutUrl = session.url;
      stripeCheckoutId = session.id;
    }

    // Create escrow record
    const escrow = await prisma.escrowPayment.create({
      data: {
        jobId: quote.jobId,
        quoteId: quote.id,
        totalAmount,
        platformFeeAmount,
        commissionAmount,
        contractorAmount,
        status: devMode ? 'funded' : 'pending',
        ...(stripeCheckoutId && { stripeCheckoutId }),
        ...(checkoutUrl && { paymentLink: checkoutUrl }),
      },
    });

    // Update job status
    await prisma.job.update({
      where: { id: quote.jobId },
      data: { status: devMode ? 'InProgress' : 'QuoteApproved' },
    });

    // Send client payment email with checkout link
    if (checkoutUrl && quote.job.clientLead?.email) {
      const { sendClientPaymentEmail } = await import('../services/email.service');
      sendClientPaymentEmail(
        quote.job.clientLead.email,
        quote.job.clientLead.firstName,
        quote.job.title,
        totalAmount.toFixed(2),
        checkoutUrl,
      ).catch(() => {});
    }

    res.status(201).json({
      success: true,
      data: {
        escrow,
        checkoutUrl,
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
    const devMode = await isDeveloperMode();

    // ─── Execute Stripe Transfers (only in production) ──────────────────
    if (!devMode && escrow.stripePaymentIntentId) {
      try {
        // 1. Transfer to contractor's Stripe Connect account
        if (job.claimedBy?.stripeConnectId) {
          await stripe.transfers.create({
            amount: Math.round(escrow.contractorAmount * 100),
            currency: 'usd',
            destination: job.claimedBy.stripeConnectId,
            source_transaction: escrow.stripePaymentIntentId,
            metadata: { jobId: job.id, type: 'contractor_payout' },
          });
          logger.info(`[Escrow] Transferred $${escrow.contractorAmount} to contractor ${job.claimedById}`);
        }

        // 2. Transfer to referee's Stripe Connect account
        if (job.postedBy?.stripeConnectId) {
          await stripe.transfers.create({
            amount: Math.round(escrow.commissionAmount * 100),
            currency: 'usd',
            destination: job.postedBy.stripeConnectId,
            source_transaction: escrow.stripePaymentIntentId,
            metadata: { jobId: job.id, type: 'referral_commission' },
          });
          logger.info(`[Escrow] Transferred $${escrow.commissionAmount} commission to referee ${job.postedById}`);
        } else {
          // Queue for later if referee hasn't onboarded Connect yet
          await commissionQueue.add(
            { jobId: job.id, referrerId: job.postedById, amount: escrow.commissionAmount },
            { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
          );
        }

        // 3. Platform fee stays in platform Stripe account (automatic)
        logger.info(`[Escrow] Platform fee $${escrow.platformFeeAmount} retained`);
      } catch (transferErr: any) {
        logger.error(`[Escrow] Transfer error for job ${job.id}:`, transferErr);
        // Don't fail the release — transfers can be retried
      }
    }

    // Mark as released
    const refereeHasConnect = !!job.postedBy?.stripeConnectId;
    await prisma.$transaction([
      prisma.escrowPayment.update({
        where: { id: escrowId },
        data: { status: 'released', releasedAt: new Date() },
      }),
      prisma.job.update({
        where: { id: job.id },
        data: { status: 'Completed' },
      }),
      // Create commission record — only mark 'paid' if referee has Connect (transfer already sent)
      prisma.commission.create({
        data: {
          jobId: job.id,
          referrerId: job.postedById,
          amount: escrow.commissionAmount,
          status: refereeHasConnect ? 'paid' : 'pending',
          paidAt: refereeHasConnect ? new Date() : undefined,
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
      // Update referee stats — only increment if commission was paid directly
      ...(refereeHasConnect ? [
        prisma.contractorProfile.update({
          where: { userId: job.postedById },
          data: { totalEarned: { increment: escrow.commissionAmount } },
        }),
      ] : []),
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

    // Admin notification
    import('../services/email.service').then(({ sendAdminNotificationEmail }) =>
      sendAdminNotificationEmail('Escrow Released', {
        Job: job.title,
        'Total Amount': `$${escrow.totalAmount.toFixed(2)}`,
        'Contractor Payout': `$${escrow.contractorAmount.toFixed(2)}`,
        'Referee Commission': `$${escrow.commissionAmount.toFixed(2)}`,
        'Platform Fee': `$${escrow.platformFeeAmount.toFixed(2)}`,
        Contractor: job.claimedBy?.name ?? 'N/A',
        Referee: job.postedBy?.name ?? 'N/A',
      }).catch(() => {})
    );

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

    const devMode = await isDeveloperMode();

    // ─── Execute Stripe Refund ───────────────────────────────────────────
    if (!devMode && escrow.stripePaymentIntentId) {
      try {
        await stripe.refunds.create({
          payment_intent: escrow.stripePaymentIntentId,
          reason: 'requested_by_customer',
          metadata: { jobId: escrow.jobId, escrowId, type: 'escrow_refund' },
        });
        logger.info(`[Escrow] Refunded $${escrow.totalAmount} for job ${escrow.jobId}`);
      } catch (refundErr: any) {
        logger.error(`[Escrow] Refund error for job ${escrow.jobId}:`, refundErr);
        return next(new AppError(`Stripe refund failed: ${refundErr.message}`, 500));
      }
    }

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

    // Send client completion confirmation email
    if (job.clientLead?.email) {
      const { sendJobCompletedEmail } = await import('../services/email.service');
      const portalUrl = `${env.WEB_URL}/client/${job.clientLead.accessToken}`;
      sendJobCompletedEmail(job.clientLead.email, job.clientLead.firstName, job.title, portalUrl).catch(() => {});
    }

    res.json({ success: true, data: { job: updated } });
  } catch (err) {
    next(err);
  }
}
