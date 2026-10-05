import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { startOfDay, endOfDay, addDays } from '../utils/dateHelpers';

// GET /dashboard/stats
export async function getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Auto-mark overdue
    await prisma.task.updateMany({
      where: {
        userId: req.userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { lt: todayStart },
      },
      data: { status: 'OVERDUE' },
    });

    // Today's tasks
    const [todayTotal, todayCompleted, todayPending, overdue, upcoming] = await Promise.all([
      prisma.task.count({ where: { userId: req.userId, dueDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.task.count({ where: { userId: req.userId, status: 'COMPLETED', dueDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.task.count({ where: { userId: req.userId, status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.task.count({ where: { userId: req.userId, status: 'OVERDUE' } }),
      prisma.task.findMany({
        where: {
          userId: req.userId,
          dueDate: { gt: todayEnd, lte: endOfDay(addDays(today, 7)) },
          status: { not: 'COMPLETED' },
        },
        include: { category: true },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ]);

    // Today's tasks list
    const todayTasks = await prisma.task.findMany({
      where: { userId: req.userId, dueDate: { gte: todayStart, lte: todayEnd } },
      include: { category: true, reminders: true },
      orderBy: [{ status: 'asc' }, { priority: 'asc' }],
    });

    // Overdue tasks list
    const overdueTasks = await prisma.task.findMany({
      where: { userId: req.userId, status: 'OVERDUE' },
      include: { category: true },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    // Recent completions (last 7 days for productivity summary)
    const weekAgo = addDays(today, -7);
    const recentCompletions = await prisma.task.findMany({
      where: {
        userId: req.userId,
        status: 'COMPLETED',
        completedAt: { gte: weekAgo },
      },
      select: { completedAt: true },
    });

    // Build daily completion map for chart
    const dailyStats: { date: string; completed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today, -i);
      const dateStr = d.toISOString().split('T')[0];
      const count = recentCompletions.filter((t) => {
        const c = t.completedAt;
        return c && c.toISOString().split('T')[0] === dateStr;
      }).length;
      dailyStats.push({ date: dateStr, completed: count });
    }

    const completionRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    successResponse(res, {
      stats: {
        todayTotal,
        todayCompleted,
        todayPending,
        overdue,
        completionRate,
      },
      todayTasks,
      overdueTasks,
      upcomingTasks: upcoming,
      dailyStats,
    });
  } catch (err) {
    console.error('GetDashboardStats error:', err);
    errorResponse(res, 'Failed to fetch dashboard stats', 500);
  }
}

// GET /dashboard/streak
export async function getStreak(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const today = new Date();
    let streak = 0;
    let checkDate = startOfDay(today);

    // Walk backwards counting days with at least one completed task
    for (let i = 0; i < 365; i++) {
      const dayStart = startOfDay(addDays(checkDate, -i));
      const dayEnd = endOfDay(addDays(checkDate, -i));

      const completed = await prisma.task.count({
        where: {
          userId: req.userId,
          status: 'COMPLETED',
          completedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      if (completed > 0) {
        streak++;
      } else if (i > 0) {
        // Allow today to have no completions yet
        break;
      }
    }

    successResponse(res, { streak });
  } catch (err) {
    console.error('GetStreak error:', err);
    errorResponse(res, 'Failed to fetch streak', 500);
  }
}

// GET /dashboard/calendar
export async function getCalendarTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { year, month } = req.query as { year: string; month: string };

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    const tasks = await prisma.task.findMany({
      where: {
        userId: req.userId,
        dueDate: { gte: startDate, lte: endDate },
      },
      include: { category: true },
      orderBy: { dueDate: 'asc' },
    });

    successResponse(res, { tasks });
  } catch (err) {
    console.error('GetCalendarTasks error:', err);
    errorResponse(res, 'Failed to fetch calendar tasks', 500);
  }
}
