import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { stripe } from '../config/stripe';
import { AppError } from '../middleware/errorHandler';
import { ClientRequest } from '../middleware/clientAuth';
import { env } from '../config/env';
// (isDeveloperMode removed — always use real Stripe payments)
import {
  sendClientQuoteApprovedEmail,
  sendClientContractorDoneEmail,
  sendClientJobCompletedEmail,
  sendClientDisputeOpenedEmail,
  sendClientPaymentEmail,
} from '../services/email.service';

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
          paymentLink: escrow.paymentLink,
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
// Client approves a quote → auto-creates escrow with Stripe Checkout payment link

export async function approveQuote(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const { quoteId } = req.params as { quoteId: string };
    const job = req.clientJob;
    const lead = req.clientLead;

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

    // ─── Create escrow with Stripe Checkout payment link ───────────────────
    const totalAmount = quote.amount;
    const platformFeeAmount = (totalAmount * quote.platformFeePct) / 100;
    const commissionAmount = (totalAmount * quote.commissionPct) / 100;
    const contractorAmount = totalAmount - platformFeeAmount - commissionAmount;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(totalAmount * 100),
          product_data: {
            name: `Escrow Payment: ${job.title}`,
            description: `Contractor quote for "${job.title}" — funds held in escrow until job completion.`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        type: 'escrow_payment',
        jobId: job.id,
        quoteId: quote.id,
      },
      success_url: `${env.WEB_URL}/client/${lead.accessToken}?payment=success`,
      cancel_url: `${env.WEB_URL}/client/${lead.accessToken}?payment=cancelled`,
    });

    // Create escrow record
    await prisma.escrowPayment.create({
      data: {
        jobId: job.id,
        quoteId: quote.id,
        totalAmount,
        platformFeeAmount,
        commissionAmount,
        contractorAmount,
        status: 'pending',
        stripeCheckoutId: session.id,
        paymentLink: session.url,
      },
    });

    // Email client with payment link
    if (lead?.email && session.url) {
      sendClientPaymentEmail(
        lead.email, lead.firstName,
        job.title, totalAmount.toFixed(2), session.url,
      ).catch(() => {});
    }

    res.json({
      success: true,
      data: {
        message: 'Quote approved! A payment link has been sent to your email.',
        paymentLink: session.url,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /client/:token/quote/:quoteId/reject ─────────────────────────────
// Client rejects a quote (with optional reason)

export async function rejectQuote(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const { quoteId } = req.params as { quoteId: string };
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

    // 7A: Notify referee that client rejected the quote
    await prisma.notification.create({
      data: {
        userId: job.postedById,
        type: 'quote_rejected',
        title: 'Client rejected the quote',
        message: `The client rejected the $${quote.amount.toFixed(2)} quote for "${job.title}".${reason ? ` Reason: "${reason}"` : ''} The contractor may submit a revision.`,
        link: `/dashboard/my-referrals`,
      },
    });

    res.json({ success: true, data: { message: 'Quote rejected. The contractor has been notified and may submit a revision.' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /client/:token/confirm ────────────────────────────────────────────
// Client confirms job completion → auto-releases escrow payouts

export async function confirmCompletion(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const { rating, comment } = req.body; // optional inline rating
    const job = req.clientJob;

    if (job.status !== 'ContractorDone') {
      return next(new AppError('Job must be marked as done by the contractor before you can confirm', 400));
    }

    // ─── Auto-release escrow → distribute payouts ─────────────────────────
    const escrow = await prisma.escrowPayment.findUnique({
      where: { jobId: job.id },
      include: {
        job: {
          include: {
            postedBy: { select: { id: true, name: true, email: true, stripeConnectId: true } },
            claimedBy: { select: { id: true, name: true, email: true, stripeConnectId: true } },
          },
        },
      },
    });

    if (escrow && escrow.status === 'funded') {
      // Execute Stripe Transfers
      if (escrow.stripePaymentIntentId) {
        try {
          // Retrieve charge ID from PaymentIntent (source_transaction needs a charge, not PI)
          const pi = await stripe.paymentIntents.retrieve(escrow.stripePaymentIntentId);
          const chargeId = pi.latest_charge as string;

          // 1. Transfer to contractor
          if (job.claimedBy && escrow.job.claimedBy?.stripeConnectId && chargeId) {
            await stripe.transfers.create({
              amount: Math.round(escrow.contractorAmount * 100),
              currency: 'usd',
              destination: escrow.job.claimedBy.stripeConnectId,
              source_transaction: chargeId,
              metadata: { jobId: job.id, type: 'contractor_payout' },
            });
          }

          // 2. Transfer to referrer
          if (escrow.job.postedBy?.stripeConnectId && chargeId) {
            await stripe.transfers.create({
              amount: Math.round(escrow.commissionAmount * 100),
              currency: 'usd',
              destination: escrow.job.postedBy.stripeConnectId,
              source_transaction: chargeId,
              metadata: { jobId: job.id, type: 'referral_commission' },
            });
          }
          // 3. Platform fee stays in platform account (automatic)
        } catch (transferErr: any) {
          // Log but don't fail — transfers can be retried
          console.error(`[Escrow] Transfer error for job ${job.id}:`, transferErr.message);
        }
      }

      // Mark as released and update all records
      await prisma.$transaction([
        prisma.escrowPayment.update({
          where: { id: escrow.id },
          data: { status: 'released', releasedAt: new Date() },
        }),
        prisma.job.update({
          where: { id: job.id },
          data: { status: 'Completed', clientConfirmedAt: new Date() },
        }),
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
        ...(job.claimedById ? [
          prisma.contractorProfile.update({
            where: { userId: job.claimedById },
            data: {
              totalEarned: { increment: escrow.contractorAmount },
              totalJobsCompleted: { increment: 1 },
            },
          }),
        ] : []),
        // Update referee stats
        prisma.contractorProfile.update({
          where: { userId: job.postedById },
          data: { totalEarned: { increment: escrow.commissionAmount } },
        }),
      ]);
    } else {
      // No escrow — just update job status
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'Completed', clientConfirmedAt: new Date() },
      });
    }

    // Notify contractor and referee
    await prisma.notification.createMany({
      data: [
        {
          userId: job.claimedById!,
          type: 'client_confirmed',
          title: 'Client confirmed completion! 🎉',
          message: `The client confirmed that "${job.title}" is complete. ${escrow ? `$${escrow.contractorAmount.toFixed(2)} has been released to your account!` : 'Your payment is being processed.'}`,
          link: `/dashboard/jobs/${job.id}`,
        },
        {
          userId: job.postedById,
          type: 'client_confirmed',
          title: 'Client confirmed — funds released! 💰',
          message: `The client confirmed "${job.title}" is complete. ${escrow ? `$${escrow.commissionAmount.toFixed(2)} commission has been released!` : 'Commission payout is being processed.'}`,
          link: `/dashboard/earnings`,
        },
      ],
    });

    // Email client completion confirmation
    const lead = req.clientLead;
    if (lead?.email) {
      const portalUrl = `${env.WEB_URL}/client/${lead.accessToken}`;
      sendClientJobCompletedEmail(
        lead.email, `${lead.firstName} ${lead.lastName}`,
        job.title, portalUrl,
      ).catch(() => {});
    }

    res.json({ success: true, data: { message: 'Thank you for confirming! The contractor will be paid and you can leave a rating.' } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /client/:token/quote/:quoteId/counter ─────────────────────────────
// Client sends a counter-offer with a different amount and message

export async function counterOffer(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const { quoteId } = req.params;
    const { amount, message } = req.body;
    const job = req.clientJob;
    const lead = req.clientLead;

    if (!amount || amount <= 0) return next(new AppError('Counter-offer amount must be positive', 400));

    const quote = await prisma.quote.findUnique({ where: { id: quoteId as string } });
    if (!quote) return next(new AppError('Quote not found', 404));
    if (quote.jobId !== job.id) return next(new AppError('Quote does not belong to this job', 400));
    if (quote.status !== 'sent') return next(new AppError('Quote is not in a state that can be negotiated', 400));

    // Update quote with counter-offer info in the rejection note
    await prisma.quote.update({
      where: { id: quoteId as string },
      data: {
        status: 'rejected',
        rejectionNote: `COUNTER_OFFER:${amount}|${message || 'Client proposed a different amount.'}`,
      },
    });

    // Notify contractor with counter-offer details
    await prisma.notification.create({
      data: {
        userId: quote.contractorId,
        type: 'quote_rejected',
        title: '💰 Client sent a counter-offer!',
        message: `The client for "${job.title}" proposed $${parseFloat(amount).toFixed(2)} instead of your $${quote.amount.toFixed(2)}.${message ? ` Message: "${message}"` : ''} You can accept or send a new quote.`,
        link: `/dashboard/jobs/${job.id}`,
      },
    });

    // Notify referee
    await prisma.notification.create({
      data: {
        userId: job.postedById,
        type: 'quote_rejected',
        title: 'Client negotiating on quote',
        message: `The client for "${job.title}" counter-offered $${parseFloat(amount).toFixed(2)} (original: $${quote.amount.toFixed(2)}).`,
        link: `/dashboard/my-referrals`,
      },
    });

    res.json({
      success: true,
      data: { message: 'Counter-offer sent to the contractor. They will review and respond.' },
    });
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

    // Email client dispute confirmation
    const lead = req.clientLead;
    if (lead?.email) {
      const portalUrl = `${env.WEB_URL}/client/${lead.accessToken}`;
      sendClientDisputeOpenedEmail(
        lead.email, `${lead.firstName} ${lead.lastName}`,
        job.title, portalUrl,
      ).catch(() => {});
    }

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

// ─── GET /client/:token/pay ─────────────────────────────────────────────────
// Returns payment link for the client to pay via Stripe

export async function getPaymentPage(req: ClientRequest, res: Response, next: NextFunction) {
  try {
    const job = req.clientJob;

    if (!['QuoteApproved', 'EscrowFunded', 'InProgress'].includes(job.status)) {
      return next(new AppError('Payment is not available at this stage', 400));
    }

    // If escrow already exists and has a payment link, return it
    const escrow = await prisma.escrowPayment.findUnique({ where: { jobId: job.id } });

    if (escrow && escrow.paymentLink) {
      return res.json({
        success: true,
        data: {
          url: escrow.paymentLink,
          amount: escrow.totalAmount,
          status: escrow.status,
        },
      });
    }

    // No escrow / payment link yet — the escrow creation happens on quote approval
    // Return a status indicating the payment link is being generated
    res.json({
      success: true,
      data: {
        url: null,
        message: 'Payment link is being generated. Please check back in a moment.',
      },
    });
  } catch (err) {
    next(err);
  }
}
