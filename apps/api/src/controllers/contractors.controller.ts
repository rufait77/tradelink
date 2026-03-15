// @ts-nocheck
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
    const id = req.params.id as string;
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
    const id = req.params.id as string;
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

// ═══════════════════════════════════════════════════════════════════════════════
// 6C — Completion Photo Upload (before/after photos on jobs)
// ═══════════════════════════════════════════════════════════════════════════════

const jobPhotosDir = path.resolve(env.UPLOAD_DIR, 'jobs');
if (!fs.existsSync(jobPhotosDir)) fs.mkdirSync(jobPhotosDir, { recursive: true });

const jobPhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, jobPhotosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `job-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const completionPhotoUpload = multer({
  storage: jobPhotoStorage,
  limits: { fileSize: parseInt(env.MAX_FILE_SIZE_MB.toString()) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (!allowed.test(file.mimetype)) return cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    cb(null, true);
  },
}).array('photos', 6); // max 6 photos (3 before + 3 after)

// POST /jobs/:id/completion-photos
export async function uploadCompletionPhotos(req: AuthRequest, res: Response, next: NextFunction) {
  completionPhotoUpload(req as any, res, async (err) => {
    if (err) return next(new AppError(err.message, 400));
    const files = (req as any).files as Express.Multer.File[];
    if (!files || files.length === 0) return next(new AppError('No files uploaded', 400));

    const jobId = req.params.id;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.claimedById !== req.user!.userId) return next(new AppError('Not authorized', 403));

    const photoUrls = files.map(f => `/uploads/jobs/${f.filename}`);

    // Append to existing photos
    const existing = job.completionPhotos ?? [];
    const updated = [...existing, ...photoUrls];

    await prisma.job.update({
      where: { id: jobId },
      data: { completionPhotos: updated },
    });

    res.json({ success: true, data: { photos: updated, added: photoUrls.length } });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6D — Insurance & Certification Uploads
// ═══════════════════════════════════════════════════════════════════════════════

const docsDir = path.resolve(env.UPLOAD_DIR, 'documents');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

const docStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, docsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `doc-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const documentUpload = multer({
  storage: docStorage,
  limits: { fileSize: parseInt(env.MAX_FILE_SIZE_MB.toString()) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|pdf/;
    if (!allowed.test(file.mimetype) && !file.originalname.endsWith('.pdf')) {
      return cb(new Error('Only images or PDF files are allowed'));
    }
    cb(null, true);
  },
}).single('document');

// POST /contractors/upload-insurance
export async function uploadInsurance(req: AuthRequest, res: Response, next: NextFunction) {
  documentUpload(req as any, res, async (err) => {
    if (err) return next(new AppError(err.message, 400));
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const insuranceUrl = `/uploads/documents/${req.file.filename}`;
    const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;

    await prisma.contractorProfile.update({
      where: { userId: req.user!.userId },
      data: {
        insuranceUrl,
        ...(expiryDate && { insuranceExpiry: expiryDate }),
      },
    });

    res.json({ success: true, data: { insuranceUrl, expiryDate } });
  });
}

// POST /contractors/upload-certification
export async function uploadCertification(req: AuthRequest, res: Response, next: NextFunction) {
  documentUpload(req as any, res, async (err) => {
    if (err) return next(new AppError(err.message, 400));
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const { name, issuedBy, expiresAt } = req.body;

    // Get existing certifications
    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    const existing = (profile?.certifications as any[] ?? []);

    const newCert = {
      id: `cert-${Date.now()}`,
      name: name ?? 'Certification',
      fileUrl,
      issuedBy: issuedBy ?? '',
      expiresAt: expiresAt ?? null,
      uploadedAt: new Date().toISOString(),
    };

    await prisma.contractorProfile.update({
      where: { userId: req.user!.userId },
      data: {
        certifications: [...existing, newCert],
      },
    });

    res.json({ success: true, data: { certification: newCert } });
  });
}

// DELETE /contractors/certification/:certId
export async function deleteCertification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { certId } = req.params;
    const profile = await prisma.contractorProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    const existing = (profile?.certifications as any[] ?? []);
    const filtered = existing.filter((c: any) => c.id !== certId);

    if (filtered.length === existing.length) return next(new AppError('Certification not found', 404));

    await prisma.contractorProfile.update({
      where: { userId: req.user!.userId },
      data: { certifications: filtered },
    });

    res.json({ success: true, data: { message: 'Certification removed' } });
  } catch (err) {
    next(err);
  }
}
