import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

// ─── File upload config ───────────────────────────────────────────────────────

const uploadDir = path.resolve(env.UPLOAD_DIR, 'profiles');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const profilePhotoUpload = multer({
  storage,
  limits: { fileSize: parseInt(env.MAX_FILE_SIZE_MB.toString()) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (!allowed.test(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    }
    cb(null, true);
  },
}).single('photo');

// ─── GET /contractors/profile ─────────────────────────────────────────────────

export async function getMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: req.user!.userId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    });
    if (!profile) return next(new AppError('Profile not found', 404));
    res.json({ success: true, data: { profile } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /contractors/profile ─────────────────────────────────────────────────

export async function updateMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { tradeTypes, bio, licenseNumber, streetAddress, city, state, zipCode, yearsExperience } = req.body;

    const profile = await prisma.contractorProfile.update({
      where: { userId: req.user!.userId },
      data: {
        ...(tradeTypes && { tradeTypes }),
        ...(bio !== undefined && { bio }),
        ...(licenseNumber !== undefined && { licenseNumber }),
        ...(streetAddress !== undefined && { streetAddress }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode }),
        ...(yearsExperience !== undefined && { yearsExperience }),
        onboardingComplete: true,
      },
    });

    res.json({ success: true, data: { profile } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /contractors/profile/photo ─────────────────────────────────────────

export async function uploadProfilePhoto(req: AuthRequest, res: Response, next: NextFunction) {
  profilePhotoUpload(req as any, res, async (err) => {
    if (err) return next(new AppError(err.message, 400));
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    await prisma.contractorProfile.update({
      where: { userId: req.user!.userId },
      data: { photoUrl },
    });

    res.json({ success: true, data: { photoUrl } });
  });
}

// ─── GET /contractors/:id ─────────────────────────────────────────────────────

export async function getPublicProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: id },
      include: {
        user: { select: { id: true, name: true, createdAt: true } },
      },
    });
    if (!profile) return next(new AppError('Contractor not found', 404));

    res.json({ success: true, data: { profile } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /contractors/:id/reviews ─────────────────────────────────────────────

export async function getContractorReviews(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string ?? '1');
    const pageSize = 10;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { revieweeId: id, isFlagged: false },
        include: { reviewer: { select: { id: true, name: true, profile: { select: { photoUrl: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.review.count({ where: { revieweeId: id, isFlagged: false } }),
    ]);

    res.json({ success: true, data: { reviews, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    next(err);
  }
}
