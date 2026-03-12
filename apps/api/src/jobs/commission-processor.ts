import { commissionQueue } from '../controllers/payments.controller';
import { prisma } from '../config/prisma';
import { stripe } from '../config/stripe';
import { sendCommissionPaidEmail } from '../services/email.service';
import { logger } from '../config/logger';

// ─── Commission Payout Queue Processor ────────────────────────────────────────
// Processes commission payouts queued after a job payment is completed.
// Attempts to transfer the referral commission to the referrer via Stripe Connect.

commissionQueue.process(async (job) => {
  const { jobId, referrerId, amount } = job.data as {
    jobId: string;
    referrerId: string;
    amount: number;
  };

  logger.info(`[CommissionQueue] Processing payout: job=${jobId}, referrer=${referrerId}, amount=$${amount}`);

  const commission = await prisma.commission.findFirst({
    where: { jobId, referrerId, status: 'pending' },
  });

  if (!commission) {
    logger.warn(`[CommissionQueue] No pending commission found for job=${jobId}`);
    return;
  }

  // Get referrer's Stripe Connect account
  const referrer = await prisma.user.findUnique({
    where: { id: referrerId },
    select: { stripeConnectId: true, profile: { select: { stripeConnectStatus: true } } },
  });

  if (!referrer?.stripeConnectId || referrer.profile?.stripeConnectStatus !== 'active') {
    logger.warn(`[CommissionQueue] Referrer ${referrerId} has no active Stripe Connect. Skipping.`);
    // Keep as pending — admin can manually retry via admin panel
    return;
  }

  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // cents
      currency: 'usd',
      destination: referrer.stripeConnectId,
      description: `Tradelink referral commission for job ${jobId}`,
      metadata: { jobId, referrerId, commissionId: commission.id },
    });

    // Mark paid
    await prisma.commission.update({
      where: { id: commission.id },
      data: { status: 'paid', paidAt: new Date(), stripeTransferId: transfer.id },
    });

    // Update totalEarned
    await prisma.contractorProfile.update({
      where: { userId: referrerId },
      data: { totalEarned: { increment: amount } },
    });

    // Notify referrer
    const referrerUser = await prisma.user.findUnique({ where: { id: referrerId } });
    const jobRecord = await prisma.job.findUnique({ where: { id: jobId } });

    if (referrerUser) {
      await prisma.notification.create({
        data: {
          userId: referrerId,
          type: 'commission_paid',
          title: 'Commission Paid! 🎉',
          message: `Your $${amount.toFixed(2)} referral commission for "${jobRecord?.title}" has been deposited.`,
          link: '/dashboard/earnings',
        },
      });

      await sendCommissionPaidEmail(referrerUser.email, referrerUser.name, amount.toFixed(2), jobRecord?.title ?? 'Job');
    }

    logger.info(`[CommissionQueue] ✅ Payout completed: transfer=${transfer.id}, amount=$${amount}`);
  } catch (err: any) {
    logger.error(`[CommissionQueue] ❌ Payout failed: ${err.message}`);
    // Mark as failed so admin can see and retry
    await prisma.commission.update({
      where: { id: commission.id },
      data: { status: 'failed' as any },
    });
    throw err; // Bull will retry based on backoff strategy
  }
});

commissionQueue.on('completed', (job) => {
  logger.info(`[CommissionQueue] Job ${job.id} completed`);
});

commissionQueue.on('failed', (job, err) => {
  logger.error(`[CommissionQueue] Job ${job.id} failed: ${err.message}`);
});

logger.info('✅ Commission payout queue processor started');
