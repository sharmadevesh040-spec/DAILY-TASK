"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = getDashboardStats;
exports.getStreak = getStreak;
exports.getCalendarTasks = getCalendarTasks;
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const dateHelpers_1 = require("../utils/dateHelpers");
// GET /dashboard/stats
async function getDashboardStats(req, res) {
    try {
        const today = new Date();
        const todayStart = (0, dateHelpers_1.startOfDay)(today);
        const todayEnd = (0, dateHelpers_1.endOfDay)(today);
        // Auto-mark overdue
        await prisma_1.prisma.task.updateMany({
            where: {
                userId: req.userId,
                status: { in: ['TODO', 'IN_PROGRESS'] },
                dueDate: { lt: todayStart },
            },
            data: { status: 'OVERDUE' },
        });
        // Today's tasks
        const [todayTotal, todayCompleted, todayPending, overdue, upcoming] = await Promise.all([
            prisma_1.prisma.task.count({ where: { userId: req.userId, dueDate: { gte: todayStart, lte: todayEnd } } }),
            prisma_1.prisma.task.count({ where: { userId: req.userId, status: 'COMPLETED', dueDate: { gte: todayStart, lte: todayEnd } } }),
            prisma_1.prisma.task.count({ where: { userId: req.userId, status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { gte: todayStart, lte: todayEnd } } }),
            prisma_1.prisma.task.count({ where: { userId: req.userId, status: 'OVERDUE' } }),
            prisma_1.prisma.task.findMany({
                where: {
                    userId: req.userId,
                    dueDate: { gt: todayEnd, lte: (0, dateHelpers_1.endOfDay)((0, dateHelpers_1.addDays)(today, 7)) },
                    status: { not: 'COMPLETED' },
                },
                include: { category: true },
                orderBy: { dueDate: 'asc' },
                take: 5,
            }),
        ]);
        // Today's tasks list
        const todayTasks = await prisma_1.prisma.task.findMany({
            where: { userId: req.userId, dueDate: { gte: todayStart, lte: todayEnd } },
            include: { category: true, reminders: true },
            orderBy: [{ status: 'asc' }, { priority: 'asc' }],
        });
        // Overdue tasks list
        const overdueTasks = await prisma_1.prisma.task.findMany({
            where: { userId: req.userId, status: 'OVERDUE' },
            include: { category: true },
            orderBy: { dueDate: 'asc' },
            take: 10,
        });
        // Recent completions (last 7 days for productivity summary)
        const weekAgo = (0, dateHelpers_1.addDays)(today, -7);
        const recentCompletions = await prisma_1.prisma.task.findMany({
            where: {
                userId: req.userId,
                status: 'COMPLETED',
                completedAt: { gte: weekAgo },
            },
            select: { completedAt: true },
        });
        // Build daily completion map for chart
        const dailyStats = [];
        for (let i = 6; i >= 0; i--) {
            const d = (0, dateHelpers_1.addDays)(today, -i);
            const dateStr = d.toISOString().split('T')[0];
            const count = recentCompletions.filter((t) => {
                const c = t.completedAt;
                return c && c.toISOString().split('T')[0] === dateStr;
            }).length;
            dailyStats.push({ date: dateStr, completed: count });
        }
        const completionRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
        (0, response_1.successResponse)(res, {
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
    }
    catch (err) {
        console.error('GetDashboardStats error:', err);
        (0, response_1.errorResponse)(res, 'Failed to fetch dashboard stats', 500);
    }
}
// GET /dashboard/streak
async function getStreak(req, res) {
    try {
        const today = new Date();
        let streak = 0;
        let checkDate = (0, dateHelpers_1.startOfDay)(today);
        // Walk backwards counting days with at least one completed task
        for (let i = 0; i < 365; i++) {
            const dayStart = (0, dateHelpers_1.startOfDay)((0, dateHelpers_1.addDays)(checkDate, -i));
            const dayEnd = (0, dateHelpers_1.endOfDay)((0, dateHelpers_1.addDays)(checkDate, -i));
            const completed = await prisma_1.prisma.task.count({
                where: {
                    userId: req.userId,
                    status: 'COMPLETED',
                    completedAt: { gte: dayStart, lte: dayEnd },
                },
            });
            if (completed > 0) {
                streak++;
            }
            else if (i > 0) {
                // Allow today to have no completions yet
                break;
            }
        }
        (0, response_1.successResponse)(res, { streak });
    }
    catch (err) {
        console.error('GetStreak error:', err);
        (0, response_1.errorResponse)(res, 'Failed to fetch streak', 500);
    }
}
// GET /dashboard/calendar
async function getCalendarTasks(req, res) {
    try {
        const { year, month } = req.query;
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
        const tasks = await prisma_1.prisma.task.findMany({
            where: {
                userId: req.userId,
                dueDate: { gte: startDate, lte: endDate },
            },
            include: { category: true },
            orderBy: { dueDate: 'asc' },
        });
        (0, response_1.successResponse)(res, { tasks });
    }
    catch (err) {
        console.error('GetCalendarTasks error:', err);
        (0, response_1.errorResponse)(res, 'Failed to fetch calendar tasks', 500);
    }
}
//# sourceMappingURL=dashboard.controller.js.map