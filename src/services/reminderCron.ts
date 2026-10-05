import cron from 'node-cron';
import { prisma } from '../utils/prisma';
import { cleanupExpiredOtps } from './otpService';

export function startReminderCron() {
  // Every minute — reminders + overdue task marking
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);

      const dueReminders = await prisma.reminder.findMany({
        where: {
          isSent: false,
          reminderTime: { gte: now, lte: oneMinuteFromNow },
        },
        include: { task: { select: { id: true, title: true, userId: true } } },
      });

      for (const reminder of dueReminders) {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { isSent: true },
        });
        console.log(`[Reminder] Task "${reminder.task.title}" is due at ${reminder.reminderTime}`);
      }

      // Auto-mark overdue tasks
      await prisma.task.updateMany({
        where: {
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: { lt: now },
        },
        data: { status: 'OVERDUE' },
      });
    } catch (err) {
      console.error('[Cron] Reminder check failed:', err);
    }
  });

  // Every hour — clean up expired OTP records
  cron.schedule('0 * * * *', async () => {
    try {
      await cleanupExpiredOtps();
    } catch (err) {
      console.error('[Cron] OTP cleanup failed:', err);
    }
  });

  console.log('[Cron] Reminder service started');
}
