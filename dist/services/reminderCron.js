"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReminderCron = startReminderCron;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../utils/prisma");
function startReminderCron() {
    // Run every minute to check for due reminders
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
            const dueReminders = await prisma_1.prisma.reminder.findMany({
                where: {
                    isSent: false,
                    reminderTime: { gte: now, lte: oneMinuteFromNow },
                },
                include: { task: { select: { id: true, title: true, userId: true } } },
            });
            for (const reminder of dueReminders) {
                // Mark as sent
                await prisma_1.prisma.reminder.update({
                    where: { id: reminder.id },
                    data: { isSent: true },
                });
                // In production, send push notification / email here
                console.log(`[Reminder] Task "${reminder.task.title}" is due at ${reminder.reminderTime}`);
            }
            // Auto-mark overdue tasks every minute
            await prisma_1.prisma.task.updateMany({
                where: {
                    status: { in: ['TODO', 'IN_PROGRESS'] },
                    dueDate: { lt: now },
                },
                data: { status: 'OVERDUE' },
            });
        }
        catch (err) {
            console.error('[Cron] Reminder check failed:', err);
        }
    });
    console.log('[Cron] Reminder service started');
}
//# sourceMappingURL=reminderCron.js.map