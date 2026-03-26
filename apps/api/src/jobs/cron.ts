import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { commissionQueue } from '../controllers/payments.controller';

// ─── Intervals ────────────────────────────────────────────────────────────────
const ONE_HOUR = 60 * 60 * 1000;
const FIFTEEN_MIN = 15 * 60 * 1000;

// ─── Job Auto-Expiry ──────────────────────────────────────────────────────────

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

// ─── Subscription Renewal Reminders ───────────────────────────────────────────

async function checkSubscriptionRenewals() {
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { gt: now, lt: sevenDaysFromNow },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    for (const sub of expiringSubscriptions) {
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
            type: 'subscription_expiring' as any,
            title: 'Subscription Ending Soon',
            message: `Your Tradelink subscription ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Renew to keep access to the job board.`,
            link: '/dashboard/billing',
          },
        });

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

// ─── Close Interest Windows (every 15 min) ───────────────────────────────────
// Automatically transitions Open jobs past their 24hr interest window to InterestClosed

async function closeInterestWindows() {
  try {
    const now = new Date();

    const closed = await prisma.job.updateMany({
      where: {
        status: 'Open',
        interestWindowEnd: { lt: now, not: null },
      },
      data: { status: 'InterestClosed' as any },
    });

    if (closed.count > 0) {
      logger.info(`[InterestWindow] Closed interest window for ${closed.count} jobs`);

      // Notify referees to select a contractor
      const closedJobs = await prisma.job.findMany({
        where: { status: 'InterestClosed' as any, updatedAt: { gte: new Date(now.getTime() - FIFTEEN_MIN) } },
        select: { id: true, title: true, postedById: true, _count: { select: { interests: true } } },
      });

      if (closedJobs.length > 0) {
        await prisma.notification.createMany({
          data: closedJobs.map((j: any) => ({
            userId: j.postedById,
            type: 'interest_received' as any,
            title: 'Interest window closed — time to choose!',
            message: `Your referral "${j.title}" received ${j._count.interests} interest${j._count.interests === 1 ? '' : 's'}. Select a contractor now.`,
            link: '/dashboard/my-referrals',
          })),
        });
      }
    }
  } catch (err) {
    logger.error('[InterestWindow] Error:', err);
  }
}

// ─── Ghost Contractor Detection (hourly) ─────────────────────────────────────
// Warns contractors assigned 48+ hours ago who haven't created a quote

async function checkGhostContractors() {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find jobs assigned 48+ hours ago that are still in "Assigned" status (no quote created)
    const ghostedJobs = await prisma.job.findMany({
      where: {
        status: 'Assigned',
        assignedAt: { lt: fortyEightHoursAgo, not: null },
      },
      include: {
        claimedBy: { select: { id: true, name: true } },
        quotes: { where: { status: { in: ['sent', 'approved', 'draft'] } } },
      },
    });

    for (const job of ghostedJobs) {
      if (job.quotes.length === 0 && job.claimedById) {
        // Check if we already warned
        const existingWarning = await prisma.notification.findFirst({
          where: {
            userId: job.claimedById,
            type: 'ghost_warning' as any,
            link: `/dashboard/jobs/${job.id}`,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!existingWarning) {
          // First warning — send ghost warning
          await prisma.notification.create({
            data: {
              userId: job.claimedById,
              type: 'ghost_warning' as any,
              title: '⚠️ Action required — send a quote!',
              message: `You were assigned "${job.title}" over 48 hours ago but haven't sent a quote. You have 24 hours to respond or the assignment will be revoked.`,
              link: `/dashboard/jobs/${job.id}`,
            },
          });
          logger.info(`[GhostDetection] Warning sent to ${job.claimedBy?.name} for job "${job.title}"`);
        } else if (existingWarning.createdAt < twentyFourHoursAgo) {
          // Warning was sent 24+ hours ago — auto-revoke assignment
          const [, updatedProfile] = await prisma.$transaction([
            // Return job to Open
            prisma.job.update({
              where: { id: job.id },
              data: {
                status: 'Open',
                claimedById: null,
                assignedAt: null,
                interestWindowEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // new 24hr window
              },
            }),
            // Add ghost strike
            prisma.contractorProfile.update({
              where: { userId: job.claimedById },
              data: { ghostStrikes: { increment: 1 } },
            }),
          ]);

          // Check if 3+ ghost strikes → auto-suspend (reads from transaction result)
          if (updatedProfile && updatedProfile.ghostStrikes >= 3 && !updatedProfile.isSuspended) {
            await prisma.contractorProfile.update({
              where: { userId: job.claimedById },
              data: { isSuspended: true },
            });
            await prisma.notification.create({
              data: {
                userId: job.claimedById,
                type: 'penalty_suspension' as any,
                title: '🚫 Job claiming suspended',
                message: `You've reached 3 ghost strikes. Your ability to claim jobs has been suspended pending admin review.`,
                link: '/dashboard/settings',
              },
            });
            logger.warn(`[GhostDetection] Suspended ${job.claimedBy?.name} — 3+ ghost strikes`);
          }

          // Notify contractor of revocation + ghost strike
          await prisma.notification.create({
            data: {
              userId: job.claimedById,
              type: 'ghost_strike' as any,
              title: '❌ Assignment revoked — ghost strike added',
              message: `Your assignment for "${job.title}" was revoked for non-response. A ghost strike has been added to your profile.`,
              link: '/dashboard/jobs',
            },
          });

          // Notify referee that job is back to Open
          await prisma.notification.create({
            data: {
              userId: job.postedById,
              type: 'job_update' as any,
              title: 'Contractor removed — job re-opened',
              message: `The contractor assigned to "${job.title}" was unresponsive. The job is back to Open for new interest.`,
              link: '/dashboard/my-referrals',
            },
          });

          logger.info(`[GhostDetection] Auto-revoked assignment for "${job.title}" from ${job.claimedBy?.name}`);
        }
      }
    }
  } catch (err) {
    logger.error('[GhostDetection] Error:', err);
  }
}

// ─── Auto-Release Escrow (hourly) ────────────────────────────────────────────
// If client doesn't confirm/dispute within 5 days of contractor completing, auto-release funds

async function autoReleaseEscrow() {
  try {
    const now = new Date();

    // Find jobs where contractor marked done, autoRelease timer has passed, and client hasn't confirmed
    const autoReleaseJobs = await prisma.job.findMany({
      where: {
        status: 'ContractorDone',
        autoReleaseAt: { lt: now, not: null },
      },
      include: {
        escrow: true,
        postedBy: { select: { id: true, name: true, stripeConnectId: true } },
        claimedBy: { select: { id: true, name: true } },
      },
    });

    for (const job of autoReleaseJobs) {
      if (job.escrow && job.escrow.status === 'funded') {
        // Auto-confirm and release
        const refereeHasConnect = !!job.postedBy?.stripeConnectId;
        await prisma.$transaction([
          prisma.job.update({
            where: { id: job.id },
            data: { status: 'Completed', clientConfirmedAt: now },
          }),
          prisma.escrowPayment.update({
            where: { id: job.escrow.id },
            data: { status: 'released', releasedAt: now },
          }),
          ...(job.claimedById ? [
            prisma.contractorProfile.update({
              where: { userId: job.claimedById },
              data: {
                totalEarned: { increment: job.escrow.contractorAmount },
                totalJobsCompleted: { increment: 1 },
              },
            }),
          ] : []),
          // Commission — mark paid only if referee has Connect
          prisma.commission.create({
            data: {
              jobId: job.id,
              referrerId: job.postedById,
              amount: job.escrow.commissionAmount,
              status: refereeHasConnect ? 'paid' : 'pending',
              paidAt: refereeHasConnect ? now : undefined,
            },
          }),
          // Referee totalEarned — only increment if paid directly
          ...(refereeHasConnect ? [
            prisma.contractorProfile.update({
              where: { userId: job.postedById },
              data: { totalEarned: { increment: job.escrow.commissionAmount } },
            }),
          ] : []),
        ]);

        // Queue commission payout for referees without Connect
        if (!refereeHasConnect) {
          await commissionQueue.add(
            { jobId: job.id, referrerId: job.postedById, amount: job.escrow.commissionAmount },
            { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
          );
        }

        // Notify both parties
        const notifications = [];
        if (job.claimedById) {
          notifications.push({
            userId: job.claimedById,
            type: 'funds_released' as any,
            title: 'Payment auto-released! 💰',
            message: `$${job.escrow.contractorAmount.toFixed(2)} auto-released for "${job.title}" (client didn't respond within 5 days).`,
            link: '/dashboard/earnings',
          });
        }
        notifications.push({
          userId: job.postedById,
          type: 'funds_released' as any,
          title: 'Commission auto-released! 💰',
          message: `$${job.escrow.commissionAmount.toFixed(2)} commission auto-released for "${job.title}".`,
          link: '/dashboard/earnings',
        });

        await prisma.notification.createMany({ data: notifications });

        // 7D: Send rating prompt to client + review prompts to contractor/referee
        const clientLead = await prisma.clientLead.findFirst({ where: { jobId: job.id } });
        if (clientLead?.email) {
          const { sendClientRatingPromptEmail } = await import('../services/email.service');
          const ratingUrl = `${process.env.WEB_URL || 'https://tradelinkpro.net'}/client/${clientLead.accessToken}/rate`;
          sendClientRatingPromptEmail(clientLead.email, `${clientLead.firstName}`, job.title, ratingUrl).catch(() => {});
        }

        // Review prompt notifications
        const reviewPrompts = [];
        if (job.claimedById) {
          reviewPrompts.push({
            userId: job.claimedById,
            type: 'review_prompt' as any,
            title: 'Rate the referral quality',
            message: `How was the referral for "${job.title}"? Leave a review for ${job.postedBy.name}.`,
            link: `/dashboard/jobs/${job.id}`,
          });
        }
        reviewPrompts.push({
          userId: job.postedById,
          type: 'review_prompt' as any,
          title: 'Rate the contractor',
          message: `How did the contractor perform on "${job.title}"? Leave a review.`,
          link: `/dashboard/my-referrals`,
        });
        await prisma.notification.createMany({ data: reviewPrompts });

        logger.info(`[AutoRelease] Auto-released escrow for job "${job.title}" ($${job.escrow.totalAmount})`);
        // Admin notification
        import('../services/email.service').then(({ sendAdminNotificationEmail }) =>
          sendAdminNotificationEmail('Escrow Auto-Released', {
            Job: job.title,
            'Total Amount': `$${job.escrow!.totalAmount.toFixed(2)}`,
            Contractor: job.claimedBy?.name ?? 'N/A',
            Referee: job.postedBy?.name ?? 'N/A',
            Reason: 'Client did not respond within 5 days',
          }).catch(() => {})
        );
      }
    }
  } catch (err) {
    logger.error('[AutoRelease] Error:', err);
  }
}

// ─── Start cron intervals ────────────────────────────────────────────────────
setInterval(expireOldJobs, ONE_HOUR);
setInterval(checkSubscriptionRenewals, ONE_HOUR);
setInterval(closeInterestWindows, FIFTEEN_MIN);
setInterval(checkGhostContractors, ONE_HOUR);
setInterval(autoReleaseEscrow, ONE_HOUR);

// Run once on startup
setTimeout(() => {
  expireOldJobs();
  checkSubscriptionRenewals();
  closeInterestWindows();
  checkGhostContractors();
  autoReleaseEscrow();
}, 5000);

logger.info('✅ All cron jobs started (expiry, subscriptions, interest windows, ghost detection, auto-release)');

