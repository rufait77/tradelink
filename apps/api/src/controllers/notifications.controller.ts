import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// ─── GET /notifications ───────────────────────────────────────────────────────

export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string ?? '1');
    const pageSize = 20;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId: req.user!.userId } }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /notifications/unread-count ─────────────────────────────────────────

export async function getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    });
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /notifications/:id/read ─────────────────────────────────────────────

export async function markRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id as string, userId: req.user!.userId },
      data: { isRead: true },
    });
    res.json({ success: true, data: { message: 'Notification marked as read' } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /notifications/read-all ─────────────────────────────────────────────

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /notifications/preferences ──────────────────────────────────────────

const DEFAULT_PREFS = {
  email_job_claimed: true,
  email_job_completed: true,
  email_commission_paid: true,
  email_renewal_reminder: true,
  inapp_messages: true,
  inapp_job_updates: true,
  inapp_announcements: true,
};

export async function getNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: req.user!.userId },
      select: { notificationPrefs: true },
    });

    const prefs = profile?.notificationPrefs
      ? { ...DEFAULT_PREFS, ...(profile.notificationPrefs as object) }
      : DEFAULT_PREFS;

    res.json({ success: true, data: { preferences: prefs } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /notifications/preferences ──────────────────────────────────────────

export async function updateNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const updates = req.body as Record<string, boolean>;

    // Validate keys
    const validKeys = Object.keys(DEFAULT_PREFS);
    const invalidKeys = Object.keys(updates).filter((k) => !validKeys.includes(k));
    if (invalidKeys.length > 0) {
      return next(new AppError(`Invalid preference keys: ${invalidKeys.join(', ')}`, 400));
    }

    // Merge with existing
    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: req.user!.userId },
      select: { notificationPrefs: true },
    });

    const current = profile?.notificationPrefs
      ? { ...DEFAULT_PREFS, ...(profile.notificationPrefs as object) }
      : { ...DEFAULT_PREFS };

    const merged = { ...current, ...updates };

    await prisma.contractorProfile.update({
      where: { userId: req.user!.userId },
      data: { notificationPrefs: merged },
    });

    res.json({ success: true, data: { preferences: merged } });
  } catch (err) {
    next(err);
  }
}

