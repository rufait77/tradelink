// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { sendCommissionPaidEmail, sendJobClaimedEmail, sendJobCompletedEmail } from '../services/email.service';
import { commissionQueue } from './payments.controller';

// ─── POST /webhooks/stripe ────────────────────────────────────────────────────

export async function stripeWebhook(req: Request, res: Response, next: NextFunction) {
  const sig = req.headers['stripe-signature'] as string;
  let event: any;

  // Gracefully handle missing webhook secret
  if (!env.STRIPE_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET === 'whsec_placeholder') {
    logger.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured — skipping webhook signature verification. Set this in production!');
    try {
      event = JSON.parse(req.body.toString());
    } catch (err: any) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  } else {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      logger.warn(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: 'Invalid signature' });
    }
  }

  logger.info(`Stripe webhook received: ${event.type}`);

  try {
    switch (event.type) {
      // ── Signup fee paid → activate account ────────────────────────────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        if (pi.metadata?.type === 'signup_fee' && pi.metadata?.userId) {
          await prisma.user.update({
            where: { id: pi.metadata.userId },
            data: { isActive: true },
          });
          logger.info(`Account activated for user ${pi.metadata.userId}`);
        }
        break;
      }

      // ── Subscription invoice paid → ensure active ─────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;

        const stripeSub = await stripe.subscriptions.retrieve(subId as string);
        const userId = stripeSub.metadata?.userId;
        if (!userId) break;

        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: subId as string },
          update: {
            status: 'active',
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
          create: {
            userId,
            stripeSubscriptionId: subId as string,
            stripePriceId: stripeSub.items.data[0]?.price.id ?? '',
            status: 'active',
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
        });

        const user = await prisma.user.findFirst({ where: { stripeCustomerId: invoice.customer as string } });
        if (user) {
          const amount = (invoice.amount_paid / 100).toFixed(2);
          const nextDate = new Date(stripeSub.current_period_end * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          await sendSubscriptionConfirmEmail(user.email, user.name, amount, nextDate);
        }
        break;
      }

      // ── Invoice payment failed → mark past_due ────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subId as string },
            data: { status: 'past_due' },
          });
        }
        break;
      }

      // ── Subscription cancelled/ended ──────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'cancelled', cancelAtPeriodEnd: false },
        });
        break;
      }

      // ── Subscription updated (e.g. reinstatement) ─────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: sub.status,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });
        break;
      }

      // ── Stripe Connect onboarding complete ────────────────────────────────
      case 'account.updated': {
        const account = event.data.object;
        const userId = account.metadata?.userId;
        if (!userId) break;

        // Express accounts with only 'transfers' capability won't have charges_enabled
        // Check details_submitted + transfers capability instead
        const transfersActive =
          account.details_submitted &&
          account.capabilities?.transfers === 'active';

        const isActive = transfersActive || (
          account.charges_enabled &&
          account.payouts_enabled &&
          account.details_submitted
        );

        await prisma.contractorProfile.updateMany({
          where: { userId },
          data: { stripeConnectStatus: isActive ? 'active' : 'pending' },
        });

        logger.info(`Connect account ${account.id} for user ${userId}: ${isActive ? 'active' : 'pending'}`);
        break;
      }

      // ── Transfer (commission payout) failed ───────────────────────────────
      case 'transfer.failed': {
        const transfer = event.data.object;
        await prisma.commission.updateMany({
          where: { stripeTransferId: transfer.id },
          data: { status: 'failed' },
        });
        logger.error(`Commission transfer failed: ${transfer.id}`);
        break;
      }

      // ── Escrow Checkout Session completed ───────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.metadata?.type === 'escrow_payment' && session.metadata?.jobId) {
          const jobId = session.metadata.jobId;
          const paymentIntentId = session.payment_intent as string;

          // Mark escrow as funded
          const escrow = await prisma.escrowPayment.findFirst({ where: { jobId } });
          if (escrow && escrow.status === 'pending') {
            await prisma.escrowPayment.update({
              where: { id: escrow.id },
              data: {
                status: 'funded',
                paidAt: new Date(),
                stripePaymentIntentId: paymentIntentId,
                stripeCheckoutId: session.id,
              },
            });

            // Move job to InProgress
            const job = await prisma.job.update({
              where: { id: jobId },
              data: { status: 'InProgress' },
              include: { claimedBy: true, postedBy: true },
            });

            // Notify contractor
            if (job.claimedById) {
              await prisma.notification.create({
                data: {
                  userId: job.claimedById,
                  type: 'escrow_funded',
                  title: 'Escrow funded — you can start! 🚀',
                  message: `The client funded $${escrow.totalAmount.toFixed(2)} in escrow for "${job.title}". You can begin work now.`,
                  link: `/dashboard/jobs/${job.id}`,
                },
              });
            }

            // Notify referee
            await prisma.notification.create({
              data: {
                userId: job.postedById,
                type: 'escrow_funded',
                title: 'Client paid escrow! 💳',
                message: `The client funded escrow for "${job.title}" ($${escrow.totalAmount.toFixed(2)}). Job is now in progress.`,
                link: `/dashboard/my-referrals`,
              },
            });

            logger.info(`[Webhook] Escrow funded for job ${jobId}: $${escrow.totalAmount}`);
          }
        }
        break;
      }

      default:
        logger.debug(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// ─── Commission payout queue processor ───────────────────────────────────────

async function sendSubscriptionConfirmEmail(email: string, name: string, amount: string, nextDate: string) {
  const { sendSubscriptionConfirmEmail: send } = await import('../services/email.service');
  return send(email, name, amount, nextDate);
}

commissionQueue.process(async (job) => {
  const { jobId, referrerId, amount } = job.data as { jobId: string; referrerId: string; amount: number };

  const referrer = await prisma.user.findUnique({ where: { id: referrerId } });
  if (!referrer?.stripeConnectId) {
    throw new Error(`Referrer ${referrerId} has no Stripe Connect account`);
  }

  // Transfer commission to referrer's Connect account
  const transfer = await stripe.transfers.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    destination: referrer.stripeConnectId,
    metadata: { jobId, referrerId },
  });

  // Update commission record
  const commission = await prisma.commission.findUnique({ where: { jobId } });
  if (commission) {
    await prisma.commission.update({
      where: { id: commission.id },
      data: { status: 'paid', stripeTransferId: transfer.id, paidAt: new Date() },
    });

    // Update referrer total earned
    await prisma.contractorProfile.updateMany({
      where: { userId: referrerId },
      data: { totalEarned: { increment: amount } },
    });
  }

  // Get the job title for email
  const jobRecord = await prisma.job.findUnique({ where: { id: jobId } });

  // Send commission paid email
  await sendCommissionPaidEmail(referrer.email, referrer.name, amount.toFixed(2), jobRecord?.title ?? 'Job');

  // Send in-app notification
  await prisma.notification.create({
    data: {
      userId: referrerId,
      type: 'commission_paid',
      title: 'Commission Paid! 💸',
      message: `Your $${amount.toFixed(2)} commission for "${jobRecord?.title}" has been paid out.`,
      link: '/dashboard/earnings',
    },
  });

  logger.info(`Commission payout successful: $${amount} to ${referrerId} for job ${jobId}`);
});

commissionQueue.on('failed', (job, err) => {
  logger.error(`Commission queue job failed for jobId ${job.data.jobId}:`, err);
});
