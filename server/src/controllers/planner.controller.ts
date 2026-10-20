import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import {
  generateSmartPlan,
  suggestReschedulePlan,
  GeneratedTask,
} from '../services/aiService';
import { createNotification } from '../services/notificationService';
import { Priority } from '@prisma/client';

/**
 * POST /api/planner/generate
 * FEATURE 2: Generate structured plan from natural language prompt
 */
export async function generatePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { prompt, availableHoursPerDay, preferredTimeOfDay, startDate } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      errorResponse(res, 'Please provide a description of your goals or tasks.', 400);
      return;
    }

    // Get user categories for context
    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
      select: { id: true, name: true },
    });

    const plan = await generateSmartPlan({
      userInput: prompt.trim(),
      availableHoursPerDay: availableHoursPerDay ? Number(availableHoursPerDay) : 4,
      preferredTimeOfDay: preferredTimeOfDay || 'FLEXIBLE',
      startDate,
      categories,
    });

    successResponse(res, { plan }, 'Plan generated successfully');
  } catch (err: any) {
    console.error('generatePlan error:', err);
    errorResponse(res, err?.message || 'Failed to generate plan', 500);
  }
}

/**
 * POST /api/planner/apply
 * FEATURE 2: Create approved tasks into database with duplicate prevention
 */
export async function applyPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tasks } = req.body as { tasks: GeneratedTask[] };

    if (!Array.isArray(tasks) || tasks.length === 0) {
      errorResponse(res, 'No tasks provided to apply.', 400);
      return;
    }

    const userId = req.userId!;
    const userCategories = await prisma.category.findMany({
      where: { userId },
    });

    const categoryMap = new Map<string, string>();
    userCategories.forEach((c) => categoryMap.set(c.name.toLowerCase(), c.id));

    const createdTasks = [];
    let duplicateCount = 0;

    for (const t of tasks) {
      if (!t.title || t.title.trim().length === 0) continue;

      const dueDate = t.dueDate ? new Date(t.dueDate) : null;

      // Duplicate detection: check if same title exists with same due date
      const existing = await prisma.task.findFirst({
        where: {
          userId,
          title: t.title.trim(),
          ...(dueDate ? { dueDate } : {}),
          status: { not: 'COMPLETED' },
        },
      });

      if (existing) {
        duplicateCount++;
        continue;
      }

      // Resolve category
      let categoryId: string | null = null;
      if (t.categoryName && t.categoryName.trim()) {
        const catKey = t.categoryName.trim().toLowerCase();
        if (categoryMap.has(catKey)) {
          categoryId = categoryMap.get(catKey)!;
        } else {
          // Auto-create category for user
          const newCat = await prisma.category.create({
            data: {
              userId,
              name: t.categoryName.trim(),
              color: '#3b82f6',
            },
          });
          categoryMap.set(catKey, newCat.id);
          categoryId = newCat.id;
        }
      }

      // Valid priority
      const priority = (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(t.priority)
        ? t.priority
        : 'MEDIUM') as Priority;

      // Create main task
      const mainTask = await prisma.task.create({
        data: {
          userId,
          title: t.title.trim(),
          description: t.description?.trim() || null,
          priority,
          dueDate,
          dueTime: t.dueTime || null,
          estimatedDuration: t.estimatedDuration || null,
          categoryId,
          status: 'TODO',
        },
      });

      // Create subtasks if present
      if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
        for (const st of t.subtasks) {
          if (!st.title || st.title.trim().length === 0) continue;
          await prisma.task.create({
            data: {
              userId,
              title: st.title.trim(),
              description: st.description?.trim() || null,
              priority: (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(st.priority || '')
                ? st.priority
                : priority) as Priority,
              dueDate,
              dueTime: t.dueTime || null,
              estimatedDuration: st.estimatedDuration || null,
              categoryId,
              parentTaskId: mainTask.id,
              status: 'TODO',
            },
          });
        }
      }

      await prisma.taskHistory.create({
        data: {
          taskId: mainTask.id,
          userId,
          action: 'CREATED_AI_PLANNER',
          details: `Generated via AI Smart Planner`,
        },
      });

      createdTasks.push(mainTask);
    }

    // In-app notification
    await createNotification({
      userId,
      type: 'PLANNER_REMINDER',
      title: 'AI Smart Plan Applied! 🚀',
      message: `Created ${createdTasks.length} task${createdTasks.length === 1 ? '' : 's'}${
        duplicateCount > 0 ? ` (${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} skipped)` : ''
      }. Remember to capture a completion photo when you finish each one!`,
    });

    successResponse(
      res,
      {
        createdCount: createdTasks.length,
        skippedCount: duplicateCount,
        tasks: createdTasks,
      },
      `Successfully added ${createdTasks.length} tasks from your AI plan!`,
      201
    );
  } catch (err: any) {
    console.error('applyPlan error:', err);
    errorResponse(res, err?.message || 'Failed to apply plan', 500);
  }
}

/**
 * POST /api/planner/reschedule-suggestions
 * FEATURE 2: Rescheduling suggestions for missed or overdue tasks
 */
export async function getRescheduleSuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { availableHoursPerDay, preferences } = req.body;
    const userId = req.userId!;

    const now = new Date();

    // Auto-update overdue tasks
    await prisma.task.updateMany({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });

    const overdueTasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'OVERDUE',
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
      },
      take: 20,
    });

    const suggestions = await suggestReschedulePlan({
      overdueTasks,
      availableHoursPerDay: availableHoursPerDay ? Number(availableHoursPerDay) : 3,
      preferences,
    });

    successResponse(res, { suggestions, count: overdueTasks.length });
  } catch (err: any) {
    console.error('getRescheduleSuggestions error:', err);
    errorResponse(res, err?.message || 'Failed to generate reschedule suggestions', 500);
  }
}

/**
 * POST /api/planner/apply-reschedule
 * FEATURE 2: Apply approved rescheduling dates to tasks
 */
export async function applyReschedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { reschedules } = req.body as {
      reschedules: {
        taskId: string;
        suggestedDueDate: string;
        suggestedDueTime?: string | null;
      }[];
    };

    if (!Array.isArray(reschedules) || reschedules.length === 0) {
      errorResponse(res, 'No tasks to reschedule', 400);
      return;
    }

    const userId = req.userId!;
    const updatedTasks = [];

    for (const item of reschedules) {
      const existing = await prisma.task.findFirst({
        where: { id: item.taskId, userId },
      });

      if (!existing) continue;

      const newDueDate = new Date(item.suggestedDueDate);

      const updated = await prisma.task.update({
        where: { id: item.taskId },
        data: {
          dueDate: newDueDate,
          dueTime: item.suggestedDueTime || existing.dueTime,
          status: 'TODO', // Reset from OVERDUE to TODO
        },
      });

      await prisma.taskHistory.create({
        data: {
          taskId: item.taskId,
          userId,
          action: 'RESCHEDULED_AI',
          details: `Rescheduled to ${item.suggestedDueDate} via AI Planner`,
        },
      });

      updatedTasks.push(updated);
    }

    await createNotification({
      userId,
      type: 'PLANNER_REMINDER',
      title: 'Tasks Rescheduled! 📅',
      message: `Successfully rescheduled ${updatedTasks.length} task${
        updatedTasks.length === 1 ? '' : 's'
      } into your upcoming schedule.`,
    });

    successResponse(
      res,
      { count: updatedTasks.length, tasks: updatedTasks },
      `Successfully rescheduled ${updatedTasks.length} task${updatedTasks.length === 1 ? '' : 's'}!`
    );
  } catch (err: any) {
    console.error('applyReschedule error:', err);
    errorResponse(res, err?.message || 'Failed to apply rescheduling', 500);
  }
}

/**
 * POST /api/planner/waitlist
 * Enroll user in Automatic AI Scheduling Early Access Waitlist
 */
export async function joinAutoScheduleWaitlist(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'PLANNER_REMINDER',
        title: { contains: 'Automatic AI Schedule' },
      },
    });

    if (!existing) {
      await createNotification({
        userId,
        type: 'PLANNER_REMINDER',
        title: 'Automatic AI Schedule: Priority Waitlist Confirmed! 🚀',
        message: 'You have secured early beta access for Automatic AI Scheduling. You will receive an alert as soon as autonomous calendar time-blocking and real-time auto-shifting go live!',
      });
    }

    successResponse(
      res,
      { enrolled: true, timestamp: new Date().toISOString() },
      "You're on the priority waitlist! We'll notify you as soon as Automatic AI Scheduling launches."
    );
  } catch (err: any) {
    console.error('joinAutoScheduleWaitlist error:', err);
    errorResponse(res, 'Failed to join waitlist', 500);
  }
}
