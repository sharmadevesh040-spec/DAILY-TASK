import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { TaskStatus, Priority, RecurrenceType } from '@prisma/client';
import { addDays, addWeeks, addMonths, isWeekend } from '../utils/dateHelpers';

// Helper to log task history
async function logHistory(taskId: string, userId: string, action: string, details?: string) {
  await prisma.taskHistory.create({ data: { taskId, userId, action, details } });
}

// GET /tasks
export async function getTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      status,
      priority,
      categoryId,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { userId: req.userId };

    if (status) where['status'] = status as TaskStatus;
    if (priority) where['priority'] = priority as Priority;
    if (categoryId) where['categoryId'] = categoryId;
    if (search) {
      where['OR'] = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFrom || dateTo) {
      where['dueDate'] = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    // Auto-mark overdue tasks
    await prisma.task.updateMany({
      where: {
        userId: req.userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    });

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    let orderBy: Record<string, string> | Record<string, string>[];
    if (sortBy === 'priority') {
      orderBy = [{ priority: sortOrder }, { createdAt: 'desc' }];
    } else {
      orderBy = [{ [sortBy]: sortOrder }];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          category: true,
          reminders: true,
          recurringTask: true,
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.task.count({ where }),
    ]);

    // Client-side priority sort if needed (Prisma enum ordering isn't guaranteed alphabetical)
    let sortedTasks = tasks;
    if (sortBy === 'priority') {
      sortedTasks = tasks.sort((a, b) => {
        const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return sortOrder === 'asc' ? diff : -diff;
      });
    }

    successResponse(res, {
      tasks: sortedTasks,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('GetTasks error:', err);
    errorResponse(res, 'Failed to fetch tasks', 500);
  }
}

// GET /tasks/:id
export async function getTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { category: true, reminders: true, recurringTask: true, taskHistory: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });

    if (!task) {
      errorResponse(res, 'Task not found', 404);
      return;
    }

    successResponse(res, { task });
  } catch (err) {
    console.error('GetTask error:', err);
    errorResponse(res, 'Failed to fetch task', 500);
  }
}

// POST /tasks
export async function createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { title, description, priority, categoryId, dueDate, dueTime, recurrence, reminderMinutes } = req.body;

    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        title,
        description,
        priority: (priority as Priority) || 'MEDIUM',
        categoryId: categoryId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        dueTime: dueTime || null,
      },
      include: { category: true, reminders: true, recurringTask: true },
    });

    // Create recurring task config
    if (recurrence && recurrence.type) {
      await prisma.recurringTask.create({
        data: {
          taskId: task.id,
          recurrenceType: recurrence.type as RecurrenceType,
          recurrenceInterval: recurrence.interval || 1,
          endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
        },
      });
    }

    // Create reminder
    if (reminderMinutes && task.dueDate) {
      const reminderTime = new Date(task.dueDate);
      if (task.dueTime) {
        const [h, m] = task.dueTime.split(':').map(Number);
        reminderTime.setHours(h, m, 0, 0);
      }
      reminderTime.setMinutes(reminderTime.getMinutes() - reminderMinutes);

      await prisma.reminder.create({
        data: { taskId: task.id, reminderTime },
      });
    }

    await logHistory(task.id, req.userId!, 'CREATED', `Task "${title}" created`);

    const fullTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: { category: true, reminders: true, recurringTask: true },
    });

    successResponse(res, { task: fullTask }, 'Task created successfully', 201);
  } catch (err) {
    console.error('CreateTask error:', err);
    errorResponse(res, 'Failed to create task', 500);
  }
}

// PUT /tasks/:id
export async function updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) {
      errorResponse(res, 'Task not found', 404);
      return;
    }

    const { title, description, priority, categoryId, dueDate, dueTime, status, recurrence, reminderMinutes } = req.body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData['title'] = title;
    if (description !== undefined) updateData['description'] = description;
    if (priority !== undefined) updateData['priority'] = priority as Priority;
    if (categoryId !== undefined) updateData['categoryId'] = categoryId || null;
    if (dueDate !== undefined) updateData['dueDate'] = dueDate ? new Date(dueDate) : null;
    if (dueTime !== undefined) updateData['dueTime'] = dueTime || null;
    if (status !== undefined) {
      updateData['status'] = status as TaskStatus;
      if (status === 'COMPLETED') updateData['completedAt'] = new Date();
      else updateData['completedAt'] = null;
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: { category: true, reminders: true, recurringTask: true },
    });

    // Update recurrence
    if (recurrence !== undefined) {
      if (recurrence && recurrence.type) {
        await prisma.recurringTask.upsert({
          where: { taskId: task.id },
          create: {
            taskId: task.id,
            recurrenceType: recurrence.type as RecurrenceType,
            recurrenceInterval: recurrence.interval || 1,
            endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
          },
          update: {
            recurrenceType: recurrence.type as RecurrenceType,
            recurrenceInterval: recurrence.interval || 1,
            endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
          },
        });
      } else {
        await prisma.recurringTask.deleteMany({ where: { taskId: task.id } });
      }
    }

    // Update reminders
    if (reminderMinutes !== undefined) {
      await prisma.reminder.deleteMany({ where: { taskId: task.id } });
      if (reminderMinutes && task.dueDate) {
        const reminderTime = new Date(task.dueDate);
        if (task.dueTime) {
          const [h, m] = task.dueTime.split(':').map(Number);
          reminderTime.setHours(h, m, 0, 0);
        }
        reminderTime.setMinutes(reminderTime.getMinutes() - reminderMinutes);
        await prisma.reminder.create({ data: { taskId: task.id, reminderTime } });
      }
    }

    await logHistory(task.id, req.userId!, 'UPDATED', `Task "${task.title}" updated`);

    successResponse(res, { task }, 'Task updated successfully');
  } catch (err) {
    console.error('UpdateTask error:', err);
    errorResponse(res, 'Failed to update task', 500);
  }
}

// DELETE /tasks/:id
export async function deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) {
      errorResponse(res, 'Task not found', 404);
      return;
    }

    await prisma.task.delete({ where: { id: req.params.id } });

    successResponse(res, null, 'Task deleted successfully');
  } catch (err) {
    console.error('DeleteTask error:', err);
    errorResponse(res, 'Failed to delete task', 500);
  }
}

// PATCH /tasks/:id/status
export async function updateTaskStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { status } = req.body;
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { recurringTask: true },
    });

    if (!existing) {
      errorResponse(res, 'Task not found', 404);
      return;
    }

    const updateData: Record<string, unknown> = {
      status: status as TaskStatus,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    };

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: { category: true, reminders: true, recurringTask: true },
    });

    // Handle recurring task: create next occurrence on completion
    if (status === 'COMPLETED' && task.recurringTask && task.dueDate) {
      const rt = task.recurringTask;

      // Check end date
      const shouldContinue = !rt.endDate || new Date() < rt.endDate;

      if (shouldContinue) {
        let nextDue = new Date(task.dueDate);

        switch (rt.recurrenceType) {
          case 'DAILY':
            nextDue = addDays(nextDue, rt.recurrenceInterval);
            break;
          case 'WEEKDAYS': {
            nextDue = addDays(nextDue, 1);
            while (isWeekend(nextDue)) nextDue = addDays(nextDue, 1);
            break;
          }
          case 'WEEKLY':
            nextDue = addWeeks(nextDue, rt.recurrenceInterval);
            break;
          case 'MONTHLY':
            nextDue = addMonths(nextDue, rt.recurrenceInterval);
            break;
          case 'CUSTOM':
            nextDue = addDays(nextDue, rt.recurrenceInterval);
            break;
        }

        // Avoid creating if past endDate
        if (!rt.endDate || nextDue <= rt.endDate) {
          // Check for existing duplicate
          const duplicate = await prisma.task.findFirst({
            where: {
              userId: req.userId!,
              title: task.title,
              dueDate: nextDue,
              status: { not: 'COMPLETED' },
            },
          });

          if (!duplicate) {
            const nextTask = await prisma.task.create({
              data: {
                userId: req.userId!,
                title: task.title,
                description: task.description,
                priority: task.priority,
                categoryId: task.categoryId,
                dueDate: nextDue,
                dueTime: task.dueTime,
                status: 'TODO',
              },
            });

            await prisma.recurringTask.create({
              data: {
                taskId: nextTask.id,
                recurrenceType: rt.recurrenceType,
                recurrenceInterval: rt.recurrenceInterval,
                endDate: rt.endDate,
              },
            });

            await logHistory(nextTask.id, req.userId!, 'CREATED', `Recurring task created from "${task.title}"`);
          }
        }
      }
    }

    await logHistory(task.id, req.userId!, `STATUS_${status}`, `Task status changed to ${status}`);

    successResponse(res, { task }, 'Task status updated');
  } catch (err) {
    console.error('UpdateTaskStatus error:', err);
    errorResponse(res, 'Failed to update task status', 500);
  }
}

// GET /tasks/today
export async function getTodayTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await prisma.task.findMany({
      where: {
        userId: req.userId,
        dueDate: { gte: today, lt: tomorrow },
      },
      include: { category: true, reminders: true },
      orderBy: [{ status: 'asc' }, { priority: 'asc' }],
    });

    successResponse(res, { tasks });
  } catch (err) {
    console.error('GetTodayTasks error:', err);
    errorResponse(res, 'Failed to fetch today tasks', 500);
  }
}
