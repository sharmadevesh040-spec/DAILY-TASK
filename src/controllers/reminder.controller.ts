import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

// GET /reminders
export async function getReminders(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const reminders = await prisma.reminder.findMany({
      where: { task: { userId: req.userId } },
      include: { task: { select: { id: true, title: true, dueDate: true, dueTime: true } } },
      orderBy: { reminderTime: 'asc' },
    });

    successResponse(res, { reminders });
  } catch (err) {
    console.error('GetReminders error:', err);
    errorResponse(res, 'Failed to fetch reminders', 500);
  }
}

// POST /reminders
export async function createReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { taskId, reminderTime } = req.body;

    // Verify task belongs to user
    const task = await prisma.task.findFirst({ where: { id: taskId, userId: req.userId } });
    if (!task) {
      errorResponse(res, 'Task not found', 404);
      return;
    }

    const reminder = await prisma.reminder.create({
      data: { taskId, reminderTime: new Date(reminderTime) },
      include: { task: { select: { id: true, title: true } } },
    });

    successResponse(res, { reminder }, 'Reminder created', 201);
  } catch (err) {
    console.error('CreateReminder error:', err);
    errorResponse(res, 'Failed to create reminder', 500);
  }
}

// DELETE /reminders/:id
export async function deleteReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const reminder = await prisma.reminder.findFirst({
      where: { id: req.params.id, task: { userId: req.userId } },
    });

    if (!reminder) {
      errorResponse(res, 'Reminder not found', 404);
      return;
    }

    await prisma.reminder.delete({ where: { id: req.params.id } });

    successResponse(res, null, 'Reminder deleted');
  } catch (err) {
    console.error('DeleteReminder error:', err);
    errorResponse(res, 'Failed to delete reminder', 500);
  }
}
