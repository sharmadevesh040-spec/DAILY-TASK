"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTasks = getTasks;
exports.getTask = getTask;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.deleteTask = deleteTask;
exports.updateTaskStatus = updateTaskStatus;
exports.getTodayTasks = getTodayTasks;
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
const dateHelpers_1 = require("../utils/dateHelpers");
// Helper to log task history
async function logHistory(taskId, userId, action, details) {
    await prisma_1.prisma.taskHistory.create({ data: { taskId, userId, action, details } });
}
// GET /tasks
async function getTasks(req, res) {
    try {
        const { status, priority, categoryId, search, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc', page = '1', limit = '50', } = req.query;
        const where = { userId: req.userId };
        if (status)
            where['status'] = status;
        if (priority)
            where['priority'] = priority;
        if (categoryId)
            where['categoryId'] = categoryId;
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
        await prisma_1.prisma.task.updateMany({
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
        const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        let orderBy;
        if (sortBy === 'priority') {
            orderBy = [{ priority: sortOrder }, { createdAt: 'desc' }];
        }
        else {
            orderBy = [{ [sortBy]: sortOrder }];
        }
        const [tasks, total] = await Promise.all([
            prisma_1.prisma.task.findMany({
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
            prisma_1.prisma.task.count({ where }),
        ]);
        // Client-side priority sort if needed (Prisma enum ordering isn't guaranteed alphabetical)
        let sortedTasks = tasks;
        if (sortBy === 'priority') {
            sortedTasks = tasks.sort((a, b) => {
                const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
                return sortOrder === 'asc' ? diff : -diff;
            });
        }
        (0, response_1.successResponse)(res, {
            tasks: sortedTasks,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        });
    }
    catch (err) {
        console.error('GetTasks error:', err);
        (0, response_1.errorResponse)(res, 'Failed to fetch tasks', 500);
    }
}
// GET /tasks/:id
async function getTask(req, res) {
    try {
        const task = await prisma_1.prisma.task.findFirst({
            where: { id: req.params.id, userId: req.userId },
            include: { category: true, reminders: true, recurringTask: true, taskHistory: { orderBy: { createdAt: 'desc' }, take: 20 } },
        });
        if (!task) {
            (0, response_1.errorResponse)(res, 'Task not found', 404);
            return;
        }
        (0, response_1.successResponse)(res, { task });
    }
    catch (err) {
        console.error('GetTask error:', err);
        (0, response_1.errorResponse)(res, 'Failed to fetch task', 500);
    }
}
// POST /tasks
async function createTask(req, res) {
    try {
        const { title, description, priority, categoryId, dueDate, dueTime, recurrence, reminderMinutes } = req.body;
        const task = await prisma_1.prisma.task.create({
            data: {
                userId: req.userId,
                title,
                description,
                priority: priority || 'MEDIUM',
                categoryId: categoryId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                dueTime: dueTime || null,
            },
            include: { category: true, reminders: true, recurringTask: true },
        });
        // Create recurring task config
        if (recurrence && recurrence.type) {
            await prisma_1.prisma.recurringTask.create({
                data: {
                    taskId: task.id,
                    recurrenceType: recurrence.type,
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
            await prisma_1.prisma.reminder.create({
                data: { taskId: task.id, reminderTime },
            });
        }
        await logHistory(task.id, req.userId, 'CREATED', `Task "${title}" created`);
        const fullTask = await prisma_1.prisma.task.findUnique({
            where: { id: task.id },
            include: { category: true, reminders: true, recurringTask: true },
        });
        (0, response_1.successResponse)(res, { task: fullTask }, 'Task created successfully', 201);
    }
    catch (err) {
        console.error('CreateTask error:', err);
        (0, response_1.errorResponse)(res, 'Failed to create task', 500);
    }
}
// PUT /tasks/:id
async function updateTask(req, res) {
    try {
        const existing = await prisma_1.prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId } });
        if (!existing) {
            (0, response_1.errorResponse)(res, 'Task not found', 404);
            return;
        }
        const { title, description, priority, categoryId, dueDate, dueTime, status, recurrence, reminderMinutes } = req.body;
        const updateData = {};
        if (title !== undefined)
            updateData['title'] = title;
        if (description !== undefined)
            updateData['description'] = description;
        if (priority !== undefined)
            updateData['priority'] = priority;
        if (categoryId !== undefined)
            updateData['categoryId'] = categoryId || null;
        if (dueDate !== undefined)
            updateData['dueDate'] = dueDate ? new Date(dueDate) : null;
        if (dueTime !== undefined)
            updateData['dueTime'] = dueTime || null;
        if (status !== undefined) {
            updateData['status'] = status;
            if (status === 'COMPLETED')
                updateData['completedAt'] = new Date();
            else
                updateData['completedAt'] = null;
        }
        const task = await prisma_1.prisma.task.update({
            where: { id: req.params.id },
            data: updateData,
            include: { category: true, reminders: true, recurringTask: true },
        });
        // Update recurrence
        if (recurrence !== undefined) {
            if (recurrence && recurrence.type) {
                await prisma_1.prisma.recurringTask.upsert({
                    where: { taskId: task.id },
                    create: {
                        taskId: task.id,
                        recurrenceType: recurrence.type,
                        recurrenceInterval: recurrence.interval || 1,
                        endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
                    },
                    update: {
                        recurrenceType: recurrence.type,
                        recurrenceInterval: recurrence.interval || 1,
                        endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
                    },
                });
            }
            else {
                await prisma_1.prisma.recurringTask.deleteMany({ where: { taskId: task.id } });
            }
        }
        // Update reminders
        if (reminderMinutes !== undefined) {
            await prisma_1.prisma.reminder.deleteMany({ where: { taskId: task.id } });
            if (reminderMinutes && task.dueDate) {
                const reminderTime = new Date(task.dueDate);
                if (task.dueTime) {
                    const [h, m] = task.dueTime.split(':').map(Number);
                    reminderTime.setHours(h, m, 0, 0);
                }
                reminderTime.setMinutes(reminderTime.getMinutes() - reminderMinutes);
                await prisma_1.prisma.reminder.create({ data: { taskId: task.id, reminderTime } });
            }
        }
        await logHistory(task.id, req.userId, 'UPDATED', `Task "${task.title}" updated`);
        (0, response_1.successResponse)(res, { task }, 'Task updated successfully');
    }
    catch (err) {
        console.error('UpdateTask error:', err);
        (0, response_1.errorResponse)(res, 'Failed to update task', 500);
    }
}
// DELETE /tasks/:id
async function deleteTask(req, res) {
    try {
        const existing = await prisma_1.prisma.task.findFirst({ where: { id: req.params.id, userId: req.userId } });
        if (!existing) {
            (0, response_1.errorResponse)(res, 'Task not found', 404);
            return;
        }
        await prisma_1.prisma.task.delete({ where: { id: req.params.id } });
        (0, response_1.successResponse)(res, null, 'Task deleted successfully');
    }
    catch (err) {
        console.error('DeleteTask error:', err);
        (0, response_1.errorResponse)(res, 'Failed to delete task', 500);
    }
}
// PATCH /tasks/:id/status
async function updateTaskStatus(req, res) {
    try {
        const { status } = req.body;
        const existing = await prisma_1.prisma.task.findFirst({
            where: { id: req.params.id, userId: req.userId },
            include: { recurringTask: true },
        });
        if (!existing) {
            (0, response_1.errorResponse)(res, 'Task not found', 404);
            return;
        }
        const updateData = {
            status: status,
            completedAt: status === 'COMPLETED' ? new Date() : null,
        };
        const task = await prisma_1.prisma.task.update({
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
                        nextDue = (0, dateHelpers_1.addDays)(nextDue, rt.recurrenceInterval);
                        break;
                    case 'WEEKDAYS': {
                        nextDue = (0, dateHelpers_1.addDays)(nextDue, 1);
                        while ((0, dateHelpers_1.isWeekend)(nextDue))
                            nextDue = (0, dateHelpers_1.addDays)(nextDue, 1);
                        break;
                    }
                    case 'WEEKLY':
                        nextDue = (0, dateHelpers_1.addWeeks)(nextDue, rt.recurrenceInterval);
                        break;
                    case 'MONTHLY':
                        nextDue = (0, dateHelpers_1.addMonths)(nextDue, rt.recurrenceInterval);
                        break;
                    case 'CUSTOM':
                        nextDue = (0, dateHelpers_1.addDays)(nextDue, rt.recurrenceInterval);
                        break;
                }
                // Avoid creating if past endDate
                if (!rt.endDate || nextDue <= rt.endDate) {
                    // Check for existing duplicate
                    const duplicate = await prisma_1.prisma.task.findFirst({
                        where: {
                            userId: req.userId,
                            title: task.title,
                            dueDate: nextDue,
                            status: { not: 'COMPLETED' },
                        },
                    });
                    if (!duplicate) {
                        const nextTask = await prisma_1.prisma.task.create({
                            data: {
                                userId: req.userId,
                                title: task.title,
                                description: task.description,
                                priority: task.priority,
                                categoryId: task.categoryId,
                                dueDate: nextDue,
                                dueTime: task.dueTime,
                                status: 'TODO',
                            },
                        });
                        await prisma_1.prisma.recurringTask.create({
                            data: {
                                taskId: nextTask.id,
                                recurrenceType: rt.recurrenceType,
                                recurrenceInterval: rt.recurrenceInterval,
                                endDate: rt.endDate,
                            },
                        });
                        await logHistory(nextTask.id, req.userId, 'CREATED', `Recurring task created from "${task.title}"`);
                    }
                }
            }
        }
        await logHistory(task.id, req.userId, `STATUS_${status}`, `Task status changed to ${status}`);
        (0, response_1.successResponse)(res, { task }, 'Task status updated');
    }
    catch (err) {
        console.error('UpdateTaskStatus error:', err);
        (0, response_1.errorResponse)(res, 'Failed to update task status', 500);
    }
}
// GET /tasks/today
async function getTodayTasks(req, res) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tasks = await prisma_1.prisma.task.findMany({
            where: {
                userId: req.userId,
                dueDate: { gte: today, lt: tomorrow },
            },
            include: { category: true, reminders: true },
            orderBy: [{ status: 'asc' }, { priority: 'asc' }],
        });
        (0, response_1.successResponse)(res, { tasks });
    }
    catch (err) {
        console.error('GetTodayTasks error:', err);
        (0, response_1.errorResponse)(res, 'Failed to fetch today tasks', 500);
    }
}
//# sourceMappingURL=task.controller.js.map