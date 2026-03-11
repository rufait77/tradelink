import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// ─── Route Imports ────────────────────────────────────────────────────────────
import authRoutes from './routes/auth';
import contractorRoutes from './routes/contractors';
import jobRoutes from './routes/jobs';
import paymentRoutes from './routes/payments';
import commissionRoutes from './routes/commissions';
import notificationRoutes from './routes/notifications';
import messageRoutes from './routes/messages';
import reviewRoutes from './routes/reviews';
import settingsRoutes from './routes/settings';
import webhookRoutes from './routes/webhooks';
import adminRoutes from './routes/admin';

const app = express();

// ─── Security & Compression ───────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: [env.WEB_URL, env.ADMIN_URL],
    credentials: true,
  })
);
app.use(compression() as any);
app.use(cookieParser());

// ─── Stripe webhook must receive raw body ─────────────────────────────────────
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────────────────────
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/contractors', contractorRoutes);
app.use('/jobs', jobRoutes);
app.use('/payments', paymentRoutes);
app.use('/commissions', commissionRoutes);
app.use('/notifications', notificationRoutes);
app.use('/messages', messageRoutes);
app.use('/reviews', reviewRoutes);
app.use('/settings', settingsRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/admin', adminRoutes);

// ─── Static uploads ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(env.UPLOAD_DIR));

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`🚀 Tradelink API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;
