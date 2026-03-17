import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

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
import quoteRoutes from './routes/quotes';
import clientRoutes from './routes/client';
import escrowRoutes from './routes/escrow';
import dmRoutes from './routes/dm';

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx)

// ─── Security & Compression ───────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(
  cors({
    origin: [env.WEB_URL, env.ADMIN_URL],
    credentials: true,
  })
);
app.use(compression() as any);
app.use(cookieParser());

// ─── Global rate limiter (200 req/min per IP) ─────────────────────────────────
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path.startsWith('/webhooks'),
}));

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
app.use('/earnings', commissionRoutes); // alias so /earnings/summary also works
app.use('/notifications', notificationRoutes);
app.use('/messages', messageRoutes);
app.use('/reviews', reviewRoutes);
app.use('/settings', settingsRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/admin', adminRoutes);
app.use('/quotes', quoteRoutes);
app.use('/client', clientRoutes);
app.use('/escrow', escrowRoutes);
app.use('/dm', dmRoutes);

// ─── Static uploads ───────────────────────────────────────────────────────────
// ─── Static uploads (no directory listing, dotfiles denied) ──────────────────
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(env.UPLOAD_DIR, {
  dotfiles: 'deny',
  index: false,
}));

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start server with Socket.IO ─────────────────────────────────────────────
const server = http.createServer(app);

// Socket.IO setup
let io: any;
try {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: [env.WEB_URL, env.ADMIN_URL],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT auth middleware for sockets
  io.use((socket: any, next: any) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, env.JWT_SECRET);
      socket.userId = payload.userId || payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: any) => {
    const userId = socket.userId;
    if (!userId) return socket.disconnect();

    // Join user-specific room
    socket.join(`user:${userId}`);
    logger.info(`🔌 Socket connected: ${userId}`);

    // Broadcast online status
    socket.broadcast.emit('user:online', { userId, online: true });

    // Typing indicator
    socket.on('dm:typing', (data: { receiverId: string }) => {
      io.to(`user:${data.receiverId}`).emit('dm:typing', { userId, typing: true });
    });

    socket.on('dm:stop-typing', (data: { receiverId: string }) => {
      io.to(`user:${data.receiverId}`).emit('dm:typing', { userId, typing: false });
    });

    socket.on('disconnect', () => {
      socket.broadcast.emit('user:online', { userId, online: false });
      logger.info(`🔌 Socket disconnected: ${userId}`);
    });
  });

  // Attach io to app for use in controllers
  (app as any).io = io;
  logger.info('🔌 Socket.IO initialized');
} catch (err) {
  logger.warn('Socket.IO not available, running without WebSocket support:', err);
}

server.listen(env.PORT, () => {
  logger.info(`🚀 Tradelink API running on port ${env.PORT} [${env.NODE_ENV}]`);

  // Start background jobs
  import('./jobs/commission-processor').catch((err) => logger.error('Failed to start commission processor:', err));
  import('./jobs/cron').catch((err) => logger.error('Failed to start cron jobs:', err));
});

export default app;
