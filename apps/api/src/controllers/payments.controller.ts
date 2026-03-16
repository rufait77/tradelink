import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { stripe } from '../config/stripe';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { isDeveloperMode, getSetting } from '../services/settings.service';
import {
  sendSubscriptionConfirmEmail,
} from '../services/email.service';
import Bull from 'bull';
import { env } from '../config/env';

// Commission payout queue
export const commissionQueue = new Bull('commission-payouts', env.REDIS_URL);

// ─── POST /payments/create-intent (signup fee) ────────────────────────────────

export async function createSignupIntent(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const devMode = await isDeveloperMode();
    if (devMode) {
      return res.json({ success: true, data: { devMode: true, message: 'Developer mode — payment skipped' } });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return next(new AppError('User not found', 404));

    const signupFee = await getSetting('signup_fee');
    const amountCents = Math.round(parseFloat(signupFee ?? '29.99') * 100);

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      metadata: { userId: user.id, type: 'signup_fee' },
      description: 'Tradelink one-time platform signup fee',
    });

    res.json({ success: true, data: { clientSecret: pi.client_secret, amount: signupFee } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /payments/create-subscription ──────────────────────────────────────

export async function createSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const devMode = await isDeveloperMode();
    if (devMode) {
      // In dev mode create a fake subscription record
      await prisma.subscription.upsert({
        where: { userId: req.user!.userId },
        update: { status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        create: {
          userId: req.user!.userId,
          stripeSubscriptionId: `dev_sub_${req.user!.userId}`,
          stripePriceId: 'dev_price',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return res.json({ success: true, data: { devMode: true, message: 'Dev mode subscription activated' } });
    }

    const { paymentMethodId } = req.body as { paymentMethodId: string };

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { subscription: true },
    });
    if (!user) return next(new AppError('User not found', 404));
    if (user.subscription?.status === 'active') {
      return next(new AppError('You already have an active subscription', 409));
    }

    const subFee = await getSetting('subscription_fee');
    const amountCents = Math.round(parseFloat(subFee ?? '9.99') * 100);

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    // Attach payment method
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Create a price on the fly (recurring, based on current setting)
    const price = await stripe.prices.create({
      unit_amount: amountCents,
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: { name: 'Tradelink Monthly Subscription' },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: user.id },
    });

    // Subscription record created/updated by webhook — but optimistically create here too
    const periodStart = new Date((subscription.current_period_start as number) * 1000);
    const periodEnd = new Date((subscription.current_period_end as number) * 1000);

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { stripeSubscriptionId: subscription.id, status: 'active', stripePriceId: price.id, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
      create: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: price.id,
        status: subscription.status as any,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    const inv = (subscription.latest_invoice as any);
    const clientSecret = inv?.payment_intent?.client_secret ?? null;

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret,
        currentPeriodEnd: periodEnd,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /payments/cancel-subscription ─────────────────────────────────────

export async function cancelSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.user!.userId } });
    if (!sub || sub.status !== 'active') {
      return next(new AppError('No active subscription found', 404));
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    await prisma.subscription.update({
      where: { userId: req.user!.userId },
      data: { cancelAtPeriodEnd: true },
    });

    res.json({ success: true, data: { message: 'Subscription will cancel at the end of the current billing period.' } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /payments/subscription-status ───────────────────────────────────────

export async function getSubscriptionStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.user!.userId } });
    if (!sub) {
      return res.json({ success: true, data: { subscription: null } });
    }

    // Fetch invoices from Stripe
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    let invoices: any[] = [];
    if (user?.stripeCustomerId) {
      const stripeInvoices = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: 12 });
      invoices = stripeInvoices.data.map((inv) => ({
        id: inv.id,
        amount: inv.amount_paid / 100,
        status: inv.status,
        date: new Date(inv.created * 1000).toISOString(),
        pdf: inv.invoice_pdf,
      }));
    }

    res.json({ success: true, data: { subscription: sub, invoices } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /payments/connect/onboard ──────────────────────────────────────────

export async function connectOnboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return next(new AppError('User not found', 404));

    let connectId = user.stripeConnectId;
    if (!connectId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: { transfers: { requested: true } },
        metadata: { userId: user.id },
      });
      connectId = account.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeConnectId: connectId } });
      await prisma.contractorProfile.update({
        where: { userId: user.id },
        data: { stripeConnectStatus: 'pending' },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: connectId,
      refresh_url: `${env.WEB_URL}/dashboard/earnings?connect=refresh`,
      return_url: `${env.WEB_URL}/dashboard/earnings?connect=success`,
      type: 'account_onboarding',
    });

    res.json({ success: true, data: { url: accountLink.url } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /payments/connect/status ────────────────────────────────────────────

export async function getConnectStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { profile: true },
    });
    if (!user) return next(new AppError('User not found', 404));

    let status = user.profile?.stripeConnectStatus ?? 'not_connected';

    // If status is still "pending" and user has a Connect ID, check Stripe directly
    // This handles the case where the webhook hasn't fired yet after onboarding
    if (status === 'pending' && user.stripeConnectId) {
      try {
        const account = await stripe.accounts.retrieve(user.stripeConnectId);
        const transfersActive =
          account.details_submitted &&
          (account as any).capabilities?.transfers === 'active';
        const isActive = transfersActive || (
          account.charges_enabled &&
          account.payouts_enabled &&
          account.details_submitted
        );

        if (isActive) {
          status = 'active';
          // Sync DB so future calls don't need to hit Stripe
          await prisma.contractorProfile.updateMany({
            where: { userId: user.id },
            data: { stripeConnectStatus: 'active' },
          });
        }
      } catch (stripeErr) {
        // If Stripe fails, just return the DB status
        logger.warn(`Failed to check Connect account ${user.stripeConnectId}:`, stripeErr);
      }
    }

    res.json({
      success: true,
      data: {
        stripeConnectId: user.stripeConnectId,
        status,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /payments/job-payment ───────────────────────────────────────────────

export async function processJobPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { jobId, paymentMethodId } = req.body as { jobId: string; paymentMethodId: string };

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { postedBy: true, claimedBy: { include: { profile: true } } },
    });

    if (!job) return next(new AppError('Job not found', 404));
    if (job.status !== 'InProgress') return next(new AppError('Job must be In Progress to process payment', 400));
    if (job.claimedById !== req.user!.userId) return next(new AppError('Only the hired contractor can initiate payment', 403));

    const devMode = await isDeveloperMode();
    const [platformFeePct, commissionPct] = await Promise.all([
      getSetting('platform_fee_pct'),
      getSetting('commission_pct'),
    ]);

    const platformFeeRate = parseFloat(platformFeePct ?? '5') / 100;
    const commissionRate = parseFloat(commissionPct ?? '20') / 100;
    const jobAmount = job.budgetMax; // Use max budget as agreed amount
    const platformFee = jobAmount * platformFeeRate;
    const commissionAmount = jobAmount * commissionRate;
    const hiredAmount = jobAmount - platformFee - commissionAmount;

    if (devMode) {
      // Skip actual Stripe charge in dev mode
      await prisma.$transaction([
        prisma.job.update({ where: { id: jobId }, data: { status: 'Completed' } }),
        prisma.jobPayment.create({
          data: {
            jobId,
            stripePaymentIntentId: `dev_pi_${jobId}`,
            totalAmount: jobAmount,
            platformFeePctSnapshot: parseFloat(platformFeePct ?? '5'),
            commissionPctSnapshot: parseFloat(commissionPct ?? '20'),
            platformFeeAmount: platformFee,
            commissionAmount,
            hiredAmount,
            status: 'paid',
            paidAt: new Date(),
          },
        }),
        prisma.commission.create({
          data: {
            jobId,
            referrerId: job.postedById,
            amount: commissionAmount,
            status: 'paid',
            stripeTransferId: `dev_tr_${jobId}`,
            paidAt: new Date(),
          },
        }),
      ]);

      return res.json({ success: true, data: { devMode: true, message: 'Dev mode — payment simulated, job completed' } });
    }

    const amountCents = Math.round(jobAmount * 100);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });

    // Create Stripe payment intent
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      customer: user?.stripeCustomerId ?? undefined,
      metadata: { jobId, type: 'job_payment', postedById: job.postedById },
      description: `Tradelink job payment: ${job.title}`,
      application_fee_amount: Math.round(platformFee * 100),
    });

    if (pi.status === 'succeeded') {
      await prisma.$transaction([
        prisma.job.update({ where: { id: jobId }, data: { status: 'Completed' } }),
        prisma.jobPayment.create({
          data: {
            jobId,
            stripePaymentIntentId: pi.id,
            totalAmount: jobAmount,
            platformFeePctSnapshot: parseFloat(platformFeePct ?? '5'),
            commissionPctSnapshot: parseFloat(commissionPct ?? '20'),
            platformFeeAmount: platformFee,
            commissionAmount,
            hiredAmount,
            status: 'paid',
            paidAt: new Date(),
          },
        }),
        prisma.commission.create({
          data: { jobId, referrerId: job.postedById, amount: commissionAmount, status: 'pending' },
        }),
      ]);

      // Queue commission payout to referrer
      await commissionQueue.add(
        { jobId, referrerId: job.postedById, amount: commissionAmount },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );
    }

    res.json({
      success: true,
      data: { clientSecret: pi.client_secret, status: pi.status },
    });
  } catch (err) {
    next(err);
  }
}
