import { Router } from 'express';
import { prisma } from '../../config/prisma';
const router = Router();
router.get('/', async (_req, res, next) => {
  try {
    const subs = await prisma.subscription.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { subscriptions: subs } });
  } catch (err) { next(err); }
});
export default router;
