import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import authRouter from './admin/auth';
import usersRouter from './admin/users';
import jobsRouter from './admin/jobs';
import commissionsRouter from './admin/commissions';
import paymentsRouter from './admin/payments';
import subscriptionsRouter from './admin/subscriptions';
import reviewsRouter from './admin/reviews';
import announcementsRouter from './admin/announcements';
import analyticsRouter from './admin/analytics';
import settingsRouter from './admin/settings';
import auditLogRouter from './admin/audit-log';
import disputesRouter from './admin/disputes';

const router = Router();

// Admin auth (no guard — needed to log in)
router.use('/auth', authRouter);

// All other admin routes require admin JWT
router.use('/users', requireAdmin, usersRouter);
router.use('/jobs', requireAdmin, jobsRouter);
router.use('/commissions', requireAdmin, commissionsRouter);
router.use('/payments', requireAdmin, paymentsRouter);
router.use('/subscriptions', requireAdmin, subscriptionsRouter);
router.use('/reviews', requireAdmin, reviewsRouter);
router.use('/announcements', requireAdmin, announcementsRouter);
router.use('/analytics', requireAdmin, analyticsRouter);
router.use('/settings', requireAdmin, settingsRouter);
router.use('/audit-log', requireAdmin, auditLogRouter);
router.use('/disputes', requireAdmin, disputesRouter);

export default router;

