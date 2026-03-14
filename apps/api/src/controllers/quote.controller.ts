// @ts-nocheck
import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { getSetting } from '../services/settings.service';

// ─── POST /jobs/:id/quote ────────────────────────────────────────────────────
// Assigned contractor creates a quote for the client

export async function createQuote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id;
    const contractorId = req.user!.userId;
    const { amount, scope, scheduledDate } = req.body;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { clientLead: true },
    });
    if (!job) return next(new AppError('Job not found', 404));
    if (job.claimedById !== contractorId) return next(new AppError('Only the assigned contractor can create a quote', 403));
    if (job.status !== 'Assigned' && job.status !== 'QuoteSent') {
      return next(new AppError('Job must be in Assigned or QuoteSent status to create a quote', 400));
    }

    // Snapshot fee percentages from platform settings
    const [platformFeePctStr, commissionPctStr] = await Promise.all([
      getSetting('platform_fee_pct'),
      getSetting('commission_pct'),
    ]);
    const platformFeePct = parseFloat(platformFeePctStr ?? '5');
    const commissionPct = parseFloat(commissionPctStr ?? '20');

    const quote = await prisma.quote.create({
      data: {
        jobId,
        contractorId,
        amount: parseFloat(amount),
        scope,
        scheduledDate: new Date(scheduledDate),
        status: 'sent',
        platformFeePct,
        commissionPct,
      },
    });

    // Update job status
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'QuoteSent' },
    });

    // Notify referee
    await prisma.notification.create({
      data: {
        userId: job.postedById,
        type: 'quote_sent',
        title: 'Quote sent to client',
        message: `A quote of $${parseFloat(amount).toFixed(2)} has been sent for "${job.title}".`,
        link: `/dashboard/my-referrals`,
      },
    });

    // Calculate split preview
    const totalAmount = parseFloat(amount);
    const platformFeeAmount = (totalAmount * platformFeePct) / 100;
    const commissionAmount = (totalAmount * commissionPct) / 100;
    const contractorAmount = totalAmount - platformFeeAmount - commissionAmount;

    // TODO: Phase 2H — sendClientQuoteEmail(client, quote, contractorProfile)

    res.status(201).json({
      success: true,
      data: {
        quote,
        splitPreview: {
          total: totalAmount,
          contractorPayout: contractorAmount,
          referralFee: commissionAmount,
          platformFee: platformFeeAmount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /quotes/:id/revise ──────────────────────────────────────────────────
// Contractor submits a revised quote (after client rejects)

export async function reviseQuote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const quoteId = req.params.id;
    const contractorId = req.user!.userId;
    const { amount, scope, scheduledDate } = req.body;

    const oldQuote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { job: { include: { clientLead: true } } },
    });
    if (!oldQuote) return next(new AppError('Quote not found', 404));
    if (oldQuote.contractorId !== contractorId) return next(new AppError('Not authorized', 403));
    if (oldQuote.status !== 'rejected') return next(new AppError('Can only revise rejected quotes', 400));

    // Mark old quote as revised
    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'revised' },
    });

    // Create new quote linked to old one
    const newQuote = await prisma.quote.create({
      data: {
        jobId: oldQuote.jobId,
        contractorId,
        amount: parseFloat(amount),
        scope: scope ?? oldQuote.scope,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : oldQuote.scheduledDate,
        status: 'sent',
        revisionOfId: quoteId,
        platformFeePct: oldQuote.platformFeePct,
        commissionPct: oldQuote.commissionPct,
      },
    });

    // Update job status back to QuoteSent
    await prisma.job.update({
      where: { id: oldQuote.jobId },
      data: { status: 'QuoteSent' },
    });

    // Calculate split for new amount
    const totalAmount = parseFloat(amount);
    const platformFeeAmount = (totalAmount * oldQuote.platformFeePct) / 100;
    const commissionAmount = (totalAmount * oldQuote.commissionPct) / 100;
    const contractorAmount = totalAmount - platformFeeAmount - commissionAmount;

    // TODO: Phase 2H — sendClientQuoteEmail(client, newQuote, contractorProfile)

    res.json({
      success: true,
      data: {
        quote: newQuote,
        splitPreview: {
          total: totalAmount,
          contractorPayout: contractorAmount,
          referralFee: commissionAmount,
          platformFee: platformFeeAmount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /quotes/:id ────────────────────────────────────────────────────────
// Get quote details (contractor or referee)

export async function getQuote(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const quoteId = req.params.id;

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        job: {
          select: { id: true, title: true, postedById: true, claimedById: true },
        },
        contractor: {
          select: { id: true, name: true, profile: { select: { photoUrl: true, avgRating: true } } },
        },
        revisionOf: { select: { id: true, amount: true, status: true } },
        revisions: { select: { id: true, amount: true, status: true, createdAt: true } },
      },
    });
    if (!quote) return next(new AppError('Quote not found', 404));

    // Only contractor, referee, or admin can view
    const userId = req.user!.userId;
    if (quote.contractorId !== userId && quote.job.postedById !== userId) {
      return next(new AppError('Not authorized to view this quote', 403));
    }

    // Calculate split
    const platformFeeAmount = (quote.amount * quote.platformFeePct) / 100;
    const commissionAmount = (quote.amount * quote.commissionPct) / 100;
    const contractorAmount = quote.amount - platformFeeAmount - commissionAmount;

    res.json({
      success: true,
      data: {
        quote,
        splitBreakdown: {
          total: quote.amount,
          contractorPayout: contractorAmount,
          referralFee: commissionAmount,
          platformFee: platformFeeAmount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /jobs/:id/quotes ───────────────────────────────────────────────────
// Get all quotes for a job (contractor or referee)

export async function getJobQuotes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const jobId = req.params.id;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return next(new AppError('Job not found', 404));

    const userId = req.user!.userId;
    if (job.postedById !== userId && job.claimedById !== userId) {
      return next(new AppError('Not authorized', 403));
    }

    const quotes = await prisma.quote.findMany({
      where: { jobId },
      include: {
        contractor: {
          select: { id: true, name: true, profile: { select: { photoUrl: true, avgRating: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { quotes } });
  } catch (err) {
    next(err);
  }
}
