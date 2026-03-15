// @ts-nocheck
import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// ─── Add Strike ─────────────────────────────────────────────────────────────
export async function addStrike(contractorId: string, type: string, jobId: string | null, reason: string) {
  const strike = await prisma.contractorStrike.create({
    data: {
      contractorId,
      type: type as any,
      jobId,
      reason,
      isWarning: false,
    },
  });

  // Count active strikes for escalation
  const strikeCount = await prisma.contractorStrike.count({
    where: { contractorId, isWarning: false },
  });

  // Auto-escalation: 1st = warning, 2nd = 30-day suspend, 3rd = permanent ban
  if (strikeCount === 1) {
    // Just a warning — already created above
    await prisma.contractorStrike.update({
      where: { id: strike.id },
      data: { isWarning: true },
    });
    // Send warning notification
    await prisma.notification.create({
      data: {
        userId: contractorId,
        type: 'penalty_warning',
        title: 'Warning Issued',
        message: `You have received a warning: ${reason}. Further violations may result in suspension.`,
        link: '/dashboard/profile',
      },
    });
  } else if (strikeCount === 2) {
    // 30-day suspension
    await prisma.contractorProfile.update({
      where: { userId: contractorId },
      data: {
        isSuspended: true,
        suspendedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.notification.create({
      data: {
        userId: contractorId,
        type: 'penalty_suspension',
        title: 'Account Suspended',
        message: `Your account has been suspended for 30 days due to: ${reason}.`,
        link: '/dashboard/profile',
      },
    });
  } else if (strikeCount >= 3) {
    // Permanent ban
    await prisma.contractorProfile.update({
      where: { userId: contractorId },
      data: { isBanned: true, isSuspended: true },
    });
    await prisma.notification.create({
      data: {
        userId: contractorId,
        type: 'penalty_ban',
        title: 'Account Permanently Banned',
        message: `Your account has been permanently banned due to repeated violations: ${reason}.`,
        link: '/dashboard/profile',
      },
    });
  }

  return { strike, strikeCount };
}

// ─── Check Access ───────────────────────────────────────────────────────────
export async function checkAccess(contractorId: string): Promise<{ allowed: boolean; reason?: string }> {
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId: contractorId },
  });
  if (!profile) return { allowed: false, reason: 'Profile not found' };
  if (profile.isBanned) return { allowed: false, reason: 'Account banned' };
  if (profile.isSuspended) return { allowed: false, reason: 'Account suspended' };
  return { allowed: true };
}
