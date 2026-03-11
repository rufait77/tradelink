import { Router } from 'express';
import { prisma } from '../../config/prisma';
const router = Router();
router.get('/', async (_req, res, next) => {
  try {
    const [payments, total] = await Promise.all([
      prisma.jobPayment.findMany({ include: { job: { select: { id: true, title: true } } }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.jobPayment.count(),
    ]);
    res.json({ success: true, data: { payments, total } });
  } catch (err) { next(err); }
});
export default router;
