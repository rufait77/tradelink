import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import authRouter from './auth';
import usersRouter from './users';
import jobsRouter from './jobs';
import commissionsRouter from './commissions';
import paymentsRouter from './payments';
import subscriptionsRouter from './subscriptions';
import reviewsRouter from './reviews';
import announcementsRouter from './announcements';
import analyticsRouter from './analytics';
import settingsRouter from './settings';
import auditLogRouter from './audit-log';

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

export default router;
