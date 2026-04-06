import { Router, Request, Response, NextFunction } from 'express';
import { getAllSettings, getSetting } from '../services/settings.service';
import { requireAdmin } from '../middleware/auth';
import { updateSettings } from '../services/settings.service';
import { validate } from '../middleware/validate';
import { platformSettingsSchema } from '@tradelink/validators';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { sendEmail } from '../services/email.service';
import { logger } from '../config/logger';

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

// Public: POST /settings/contact — contact form submission
router.post('/contact', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return next(new AppError('Name, email, and message are required', 400));
    }

    const adminEmail = await getSetting('admin_notification_email') || 'Tradelinkpro.net@gmail.com';

    await sendEmail({
      to: adminEmail,
      subject: `Contact Form: ${name}`,
      html: `
        <h2 style="color:#f59e0b;margin:0 0 16px;">New Contact Form Submission</h2>
        <p style="color:#f1f5f9;margin:0 0 8px;"><strong>Name:</strong> ${name}</p>
        <p style="color:#f1f5f9;margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
        <p style="color:#f1f5f9;margin:0 0 8px;"><strong>Message:</strong></p>
        <p style="color:#cbd5e1;margin:0;white-space:pre-wrap;">${message}</p>
      `,
    });

    logger.info(`Contact form submitted by ${email}`);
    res.json({ success: true, data: { message: 'Message sent successfully' } });
  } catch (err) {
    next(err);
  }
});

export default router;
