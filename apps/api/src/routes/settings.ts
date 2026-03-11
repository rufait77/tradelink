import { Router } from 'express';
import { getAllSettings } from '../services/settings.service';
import { requireAdmin } from '../middleware/auth';
import { updateSettings } from '../services/settings.service';
import { validate } from '../middleware/validate';
import { platformSettingsSchema } from '@tradelink/validators';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { Response, NextFunction } from 'express';

const router = Router();

// Public: GET /settings/public — contractor app reads fees/settings from here
router.get('/public', async (_req, res, next) => {
  try {
    const settings = await getAllSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

export default router;
