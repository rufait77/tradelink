import { prisma } from '../config/prisma';
import { getSetting } from '../services/settings.service';
import { logger } from '../config/logger';

// ─── Job Auto-Expiry Cron ─────────────────────────────────────────────────────
// Runs a check periodically (every hour) to expire jobs past their expiresAt date.
// Also sends renewal reminders for subscriptions expiring within 7 days.

const ONE_HOUR = 60 * 60 * 1000;

async function expireOldJobs() {
  try {
    const now = new Date();

    const expired = await prisma.job.updateMany({
      where: {
        status: 'Open',
        expiresAt: { lt: now },
      },
      data: { status: 'Expired' as any },
    });

    if (expired.count > 0) {
      logger.info(`[JobExpiry] Expired ${expired.count} jobs`);

      // Notify the job posters
      const expiredJobs = await prisma.job.findMany({
        where: { status: 'Expired' as any, updatedAt: { gte: new Date(now.getTime() - ONE_HOUR) } },
        select: { id: true, title: true, postedById: true },
      });

      if (expiredJobs.length > 0) {
        await prisma.notification.createMany({
          data: expiredJobs.map((j: any) => ({
            userId: j.postedById,
            type: 'job_expired' as any,
            title: 'Referral Expired',
            message: `Your referral "${j.title}" has expired. You can repost it from your dashboard.`,
            link: '/dashboard/my-referrals',
          })),
        });
      }
    }
  } catch (err) {
    logger.error('[JobExpiry] Error:', err);
  }
}

async function checkSubscriptionRenewals() {
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Find subscriptions expiring in next 7 days that haven't been reminded
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { gt: now, lt: sevenDaysFromNow },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    for (const sub of expiringSubscriptions) {
      // Check if we already sent a reminder notification (avoid duplicates)
      const existing = await prisma.notification.findFirst({
        where: {
          userId: sub.userId,
          type: 'subscription_reminder' as any,
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      if (!existing) {
        const daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        await prisma.notification.create({
          data: {
            userId: sub.userId,
            type: 'subscription_reminder' as any,
            title: 'Subscription Ending Soon',
            message: `Your Tradelink subscription ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Renew to keep access to the job board.`,
            link: '/dashboard/billing',
          },
        });

        // Send email reminder
        try {
          const { sendSubscriptionRenewalReminderEmail } = await import('../services/email.service');
          await sendSubscriptionRenewalReminderEmail(
            sub.user.email,
            sub.user.name,
            daysLeft.toString(),
            sub.currentPeriodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          );
        } catch {
          logger.warn(`[SubscriptionReminder] Failed to send renewal email to ${sub.user.email}`);
        }
      }
    }
  } catch (err) {
    logger.error('[SubscriptionReminder] Error:', err);
  }
}

// Start the cron intervals
setInterval(expireOldJobs, ONE_HOUR);
setInterval(checkSubscriptionRenewals, ONE_HOUR);

// Run once on startup
setTimeout(() => {
  expireOldJobs();
  checkSubscriptionRenewals();
}, 5000); // 5s delay to let DB connect

logger.info('✅ Job expiry & subscription reminder cron started (every hour)');
