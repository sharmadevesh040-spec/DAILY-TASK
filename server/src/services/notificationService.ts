import webpush from 'web-push';
import { prisma } from '../utils/prisma';
import { NotificationType } from '@prisma/client';

// Configure VAPID for Web Push
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:notifications@taskflow.app';

if (!vapidPublicKey || !vapidPrivateKey) {
  // Generate VAPID keys for immediate dev/test support if not provided
  try {
    const generated = webpush.generateVAPIDKeys();
    vapidPublicKey = generated.publicKey;
    vapidPrivateKey = generated.privateKey;
    console.log('[WebPush] Auto-generated temporary VAPID keys for development.');
    console.log(`[WebPush] To persist across restarts, add to .env:`);
    console.log(`VAPID_PUBLIC_KEY=${vapidPublicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${vapidPrivateKey}`);
  } catch (err) {
    console.error('[WebPush] Failed to initialize VAPID keys:', err);
  }
}

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log('[WebPush] VAPID details configured successfully');
  } catch (err) {
    console.error('[WebPush] Error setting VAPID details:', err);
  }
}

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

/**
 * Creates an in-app notification and dispatches Web Push if user is subscribed
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  metadata?: Record<string, any>;
}) {
  const { userId, type, title, message, taskId, metadata } = params;

  try {
    // 1. Create In-App Notification in DB
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        taskId: taskId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // 2. Dispatch Web Push if configured and user has subscriptions
    await dispatchWebPushToUser(userId, {
      title,
      body: message,
      type,
      taskId,
      notificationId: notification.id,
    });

    return notification;
  } catch (err) {
    console.error('[Notification] Error creating notification:', err);
    throw err;
  }
}

/**
 * Send Web Push notification to all active devices of a user
 */
async function dispatchWebPushToUser(userId: string, payload: any) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        url: payload.taskId ? `/tasks` : '/dashboard',
        taskId: payload.taskId,
        notificationId: payload.notificationId,
      },
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        await webpush.sendNotification(pushConfig, payloadString);
      } catch (err: any) {
        // 404 or 410 indicates the subscription has expired or unsubscribed
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[WebPush] Subscription expired (${err.statusCode}), removing:`, sub.id);
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.warn('[WebPush] Error sending push notification:', err?.message || err);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (err) {
    console.warn('[WebPush] Failed to dispatch push:', err);
  }
}

/**
 * Scan for upcoming deadlines and overdue tasks to generate smart notifications
 */
export async function syncDeadlineAndOverdueNotifications(userId: string) {
  try {
    const now = new Date();
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // 1. Upcoming tasks due in next 2 hours
    const upcomingTasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { gte: now, lte: in2Hours },
      },
      take: 5,
    });

    for (const task of upcomingTasks) {
      // Check if already notified in last 6 hours
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          taskId: task.id,
          type: 'TASK_DEADLINE',
          createdAt: { gte: sixHoursAgo },
        },
      });

      if (!existing) {
        await createNotification({
          userId,
          type: 'TASK_DEADLINE',
          title: `Upcoming Deadline: ${task.title}`,
          message: `This task is due soon (${task.dueTime ? `at ${task.dueTime}` : 'today'}). Don't forget to take a photo when you complete it!`,
          taskId: task.id,
        });
      }
    }

    // 2. Overdue tasks (due date in past, not completed)
    const overdueTasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'OVERDUE',
      },
      take: 5,
    });

    for (const task of overdueTasks) {
      // Check if notified today
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          taskId: task.id,
          type: 'TASK_OVERDUE',
          createdAt: { gte: todayStart },
        },
      });

      if (!existing) {
        await createNotification({
          userId,
          type: 'TASK_OVERDUE',
          title: `Task Overdue: ${task.title}`,
          message: `This task was due on ${task.dueDate?.toLocaleDateString() || 'earlier'}. Use the AI Smart Planner to reschedule or complete it with a photo.`,
          taskId: task.id,
        });
      }
    }
  } catch (err) {
    console.error('[Notification] Error syncing deadline notifications:', err);
  }
}
