// @ts-nocheck
import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// ─── GET /dm/conversations ──────────────────────────────────────────────────
// Returns list of DM conversations with last message + unread count

export async function getDmConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    // Get all distinct conversation partners
    const sent = await prisma.directMessage.findMany({
      where: { senderId: userId, isDeleted: false },
      select: { receiverId: true },
      distinct: ['receiverId'],
    });
    const received = await prisma.directMessage.findMany({
      where: { receiverId: userId, isDeleted: false },
      select: { senderId: true },
      distinct: ['senderId'],
    });

    // Get unique partner IDs
    const partnerIds = [...new Set([
      ...sent.map(s => s.receiverId),
      ...received.map(r => r.senderId),
    ])];

    // Build conversation list
    const conversations = await Promise.all(
      partnerIds.map(async (partnerId) => {
        const [lastMessage, unreadCount, partner] = await Promise.all([
          prisma.directMessage.findFirst({
            where: {
              isDeleted: false,
              OR: [
                { senderId: userId, receiverId: partnerId },
                { senderId: partnerId, receiverId: userId },
              ],
            },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.directMessage.count({
            where: { senderId: partnerId, receiverId: userId, isRead: false, isDeleted: false },
          }),
          prisma.user.findUnique({
            where: { id: partnerId },
            select: {
              id: true, name: true,
              profile: { select: { photoUrl: true, tradeTypes: true, city: true, state: true } },
            },
          }),
        ]);

        return {
          partnerId,
          partner,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
            isRead: lastMessage.isRead,
          } : null,
          unreadCount,
        };
      })
    );

    // Sort by last message date
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.getTime() || 0;
      const bTime = b.lastMessage?.createdAt?.getTime() || 0;
      return bTime - aTime;
    });

    res.json({ success: true, data: { conversations } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /dm/:userId ────────────────────────────────────────────────────────
// Returns paginated message thread with a specific user

export async function getDmThread(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const partnerId = req.params.userId;
    const page = parseInt(req.query.page as string ?? '1');
    const pageSize = parseInt(req.query.pageSize as string ?? '50');

    // Get the partner info
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: {
        id: true, name: true, email: true,
        profile: { select: { photoUrl: true, tradeTypes: true, city: true, state: true, avgRating: true } },
      },
    });
    if (!partner) return next(new AppError('User not found', 404));

    const [messages, total] = await Promise.all([
      prisma.directMessage.findMany({
        where: {
          isDeleted: false,
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          sender: { select: { id: true, name: true, profile: { select: { photoUrl: true } } } },
        },
      }),
      prisma.directMessage.count({
        where: {
          isDeleted: false,
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId },
          ],
        },
      }),
    ]);

    // Mark incoming messages as read
    await prisma.directMessage.updateMany({
      where: { senderId: partnerId, receiverId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({
      success: true,
      data: {
        partner,
        messages: messages.reverse(), // oldest first for display
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /dm/:userId ───────────────────────────────────────────────────────
// Send a direct message

export async function sendDm(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const receiverId = req.params.userId;
    const { content, attachments } = req.body;

    if (!content?.trim() && (!attachments || attachments.length === 0)) {
      return next(new AppError('Message content is required', 400));
    }

    if (userId === receiverId) {
      return next(new AppError('Cannot send messages to yourself', 400));
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return next(new AppError('Recipient not found', 404));

    const message = await prisma.directMessage.create({
      data: {
        senderId: userId,
        receiverId,
        content: content?.trim() || '',
        attachments: attachments || undefined,
      },
      include: {
        sender: { select: { id: true, name: true, profile: { select: { photoUrl: true } } } },
      },
    });

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'direct_message',
        title: `New message from ${message.sender.name}`,
        message: content?.trim().substring(0, 100) || 'Sent an attachment',
        link: `/dashboard/messages/dm/${userId}`,
      },
    });

    // Emit via Socket.IO if available
    const io = (req.app as any).io;
    if (io) {
      io.to(`user:${receiverId}`).emit('dm:new', {
        message: {
          id: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          attachments: message.attachments,
          isRead: message.isRead,
          reactions: message.reactions,
          createdAt: message.createdAt,
          sender: message.sender,
        },
      });
    }

    res.status(201).json({ success: true, data: { message } });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /dm/:userId/read ───────────────────────────────────────────────────
// Mark all messages from a user as read

export async function markDmRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const partnerId = req.params.userId;

    const result = await prisma.directMessage.updateMany({
      where: { senderId: partnerId, receiverId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    // Emit read receipt via Socket.IO
    const io = (req.app as any).io;
    if (io) {
      io.to(`user:${partnerId}`).emit('dm:read', { readBy: userId, partnerId: userId });
    }

    res.json({ success: true, data: { markedRead: result.count } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /dm/:messageId/react ──────────────────────────────────────────────
// Add or remove emoji reaction

export async function reactToDm(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const messageId = req.params.messageId;
    const { emoji } = req.body;

    if (!emoji) return next(new AppError('Emoji is required', 400));

    const message = await prisma.directMessage.findUnique({ where: { id: messageId } });
    if (!message) return next(new AppError('Message not found', 404));
    if (message.senderId !== userId && message.receiverId !== userId) {
      return next(new AppError('Not authorized', 403));
    }

    const reactions = (message.reactions as Record<string, string[]>) || {};
    if (reactions[emoji]?.includes(userId)) {
      // Remove reaction
      reactions[emoji] = reactions[emoji].filter(id => id !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      // Add reaction
      if (!reactions[emoji]) reactions[emoji] = [];
      reactions[emoji].push(userId);
    }

    const updated = await prisma.directMessage.update({
      where: { id: messageId },
      data: { reactions },
    });

    // Emit via Socket.IO
    const io = (req.app as any).io;
    if (io) {
      const targetId = message.senderId === userId ? message.receiverId : message.senderId;
      io.to(`user:${targetId}`).emit('dm:reaction', {
        messageId, reactions, userId,
      });
    }

    res.json({ success: true, data: { reactions: updated.reactions } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /dm/:messageId/report ─────────────────────────────────────────────
// Report a message to admin

export async function reportDm(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const messageId = req.params.messageId;
    const { reason } = req.body;

    if (!reason?.trim()) return next(new AppError('Reason is required', 400));

    const message = await prisma.directMessage.findUnique({ where: { id: messageId } });
    if (!message) return next(new AppError('Message not found', 404));
    if (message.senderId !== userId && message.receiverId !== userId) {
      return next(new AppError('Not authorized', 403));
    }

    // Check for duplicate reports
    const existing = await prisma.messageReport.findFirst({
      where: { messageId, reporterId: userId },
    });
    if (existing) return next(new AppError('You have already reported this message', 400));

    const report = await prisma.messageReport.create({
      data: {
        messageId,
        reporterId: userId,
        reason: reason.trim(),
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'message_reported' as const,
          title: 'Message reported',
          message: `A direct message has been reported. Reason: ${reason.trim().substring(0, 80)}`,
          link: '/admin/reports',
        })),
      });
    }

    res.status(201).json({ success: true, data: { report } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /dm/unread-count ───────────────────────────────────────────────────
// Get total unread DM count for sidebar badge

export async function getDmUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const count = await prisma.directMessage.count({
      where: { receiverId: req.user!.userId, isRead: false, isDeleted: false },
    });
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
}
