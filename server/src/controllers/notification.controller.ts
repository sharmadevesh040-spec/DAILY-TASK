import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import {
  getVapidPublicKey,
  syncDeadlineAndOverdueNotifications,
  broadcastNotification,
} from '../services/notificationService';

// GET /api/notifications
export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { unreadOnly, page = '1', limit = '30' } = req.query as Record<string, string>;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Trigger sync for deadline & overdue notifications
    await syncDeadlineAndOverdueNotifications(req.userId!);

    const where: any = { userId: req.userId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.userId, isRead: false } }),
    ]);

    successResponse(res, {
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('getNotifications error:', err);
    errorResponse(res, 'Failed to fetch notifications', 500);
  }
}

// PATCH /api/notifications/:id/read
export async function markNotificationAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.notification.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      errorResponse(res, 'Notification not found', 404);
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.userId, isRead: false },
    });

    successResponse(res, { notification: updated, unreadCount });
  } catch (err) {
    console.error('markNotificationAsRead error:', err);
    errorResponse(res, 'Failed to update notification', 500);
  }
}

// PATCH /api/notifications/read-all
export async function markAllNotificationsAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });

    successResponse(res, { unreadCount: 0 }, 'All notifications marked as read');
  } catch (err) {
    console.error('markAllNotificationsAsRead error:', err);
    errorResponse(res, 'Failed to mark all as read', 500);
  }
}

// DELETE /api/notifications/:id
export async function deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.notification.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      errorResponse(res, 'Notification not found', 404);
      return;
    }

    await prisma.notification.delete({ where: { id } });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.userId, isRead: false },
    });

    successResponse(res, { unreadCount }, 'Notification deleted');
  } catch (err) {
    console.error('deleteNotification error:', err);
    errorResponse(res, 'Failed to delete notification', 500);
  }
}

// GET /api/notifications/vapid-public-key
export async function getVapidKey(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const publicKey = getVapidPublicKey();
    successResponse(res, { publicKey });
  } catch (err) {
    console.error('getVapidKey error:', err);
    errorResponse(res, 'Failed to get VAPID public key', 500);
  }
}

// POST /api/notifications/subscribe
export async function subscribePush(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      errorResponse(res, 'Invalid push subscription payload', 400);
      return;
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: req.userId!,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        userId: req.userId!,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    successResponse(res, null, 'Push subscription registered successfully');
  } catch (err) {
    console.error('subscribePush error:', err);
    errorResponse(res, 'Failed to register push subscription', 500);
  }
}

// POST /api/notifications/unsubscribe
export async function unsubscribePush(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      errorResponse(res, 'Endpoint required', 400);
      return;
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.userId },
    });

    successResponse(res, null, 'Push subscription removed');
  } catch (err) {
    console.error('unsubscribePush error:', err);
    errorResponse(res, 'Failed to remove push subscription', 500);
  }
}

// POST /api/notifications/broadcast
export async function broadcastAppNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { title, message, type = 'SYSTEM', metadata } = req.body;

    if (!title || !message) {
      errorResponse(res, 'Title and message are required', 400);
      return;
    }

    const result = await broadcastNotification({
      title,
      message,
      type,
      metadata,
    });

    successResponse(
      res,
      result,
      `Broadcast successfully sent to ${result.sentCount} of ${result.totalUsers} users`,
      200
    );
  } catch (err) {
    console.error('broadcastAppNotification error:', err);
    errorResponse(res, 'Failed to broadcast notification', 500);
  }
}
