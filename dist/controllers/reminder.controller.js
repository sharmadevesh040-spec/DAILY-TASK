"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReminders = getReminders;
exports.createReminder = createReminder;
exports.deleteReminder = deleteReminder;
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
// GET /reminders
async function getReminders(req, res) {
    try {
        const reminders = await prisma_1.prisma.reminder.findMany({
            where: { task: { userId: req.userId } },
            include: { task: { select: { id: true, title: true, dueDate: true, dueTime: true } } },
            orderBy: { reminderTime: 'asc' },
        });
        (0, response_1.successResponse)(res, { reminders });
    }
    catch (err) {
        console.error('GetReminders error:', err);
        (0, response_1.errorResponse)(res, 'Failed to fetch reminders', 500);
    }
}
// POST /reminders
async function createReminder(req, res) {
    try {
        const { taskId, reminderTime } = req.body;
        // Verify task belongs to user
        const task = await prisma_1.prisma.task.findFirst({ where: { id: taskId, userId: req.userId } });
        if (!task) {
            (0, response_1.errorResponse)(res, 'Task not found', 404);
            return;
        }
        const reminder = await prisma_1.prisma.reminder.create({
            data: { taskId, reminderTime: new Date(reminderTime) },
            include: { task: { select: { id: true, title: true } } },
        });
        (0, response_1.successResponse)(res, { reminder }, 'Reminder created', 201);
    }
    catch (err) {
        console.error('CreateReminder error:', err);
        (0, response_1.errorResponse)(res, 'Failed to create reminder', 500);
    }
}
// DELETE /reminders/:id
async function deleteReminder(req, res) {
    try {
        const reminder = await prisma_1.prisma.reminder.findFirst({
            where: { id: req.params.id, task: { userId: req.userId } },
        });
        if (!reminder) {
            (0, response_1.errorResponse)(res, 'Reminder not found', 404);
            return;
        }
        await prisma_1.prisma.reminder.delete({ where: { id: req.params.id } });
        (0, response_1.successResponse)(res, null, 'Reminder deleted');
    }
    catch (err) {
        console.error('DeleteReminder error:', err);
        (0, response_1.errorResponse)(res, 'Failed to delete reminder', 500);
    }
}
//# sourceMappingURL=reminder.controller.js.map