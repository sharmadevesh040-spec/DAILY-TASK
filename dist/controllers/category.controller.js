"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = getCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
const prisma_1 = require("../utils/prisma");
const response_1 = require("../utils/response");
// GET /categories
async function getCategories(req, res) {
    try {
        const categories = await prisma_1.prisma.category.findMany({
            where: { userId: req.userId },
            include: { _count: { select: { tasks: true } } },
            orderBy: { name: 'asc' },
        });
        (0, response_1.successResponse)(res, { categories });
    }
    catch (err) {
        console.error('GetCategories error:', err);
        (0, response_1.errorResponse)(res, 'Failed to fetch categories', 500);
    }
}
// POST /categories
async function createCategory(req, res) {
    try {
        const { name, color } = req.body;
        const existing = await prisma_1.prisma.category.findUnique({
            where: { userId_name: { userId: req.userId, name } },
        });
        if (existing) {
            (0, response_1.errorResponse)(res, 'Category with this name already exists', 409);
            return;
        }
        const category = await prisma_1.prisma.category.create({
            data: { userId: req.userId, name, color: color || '#6366f1' },
            include: { _count: { select: { tasks: true } } },
        });
        (0, response_1.successResponse)(res, { category }, 'Category created', 201);
    }
    catch (err) {
        console.error('CreateCategory error:', err);
        (0, response_1.errorResponse)(res, 'Failed to create category', 500);
    }
}
// PUT /categories/:id
async function updateCategory(req, res) {
    try {
        const existing = await prisma_1.prisma.category.findFirst({
            where: { id: req.params.id, userId: req.userId },
        });
        if (!existing) {
            (0, response_1.errorResponse)(res, 'Category not found', 404);
            return;
        }
        const { name, color } = req.body;
        // Check name uniqueness if renaming
        if (name && name !== existing.name) {
            const nameTaken = await prisma_1.prisma.category.findUnique({
                where: { userId_name: { userId: req.userId, name } },
            });
            if (nameTaken) {
                (0, response_1.errorResponse)(res, 'Category with this name already exists', 409);
                return;
            }
        }
        const category = await prisma_1.prisma.category.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(color && { color }),
            },
            include: { _count: { select: { tasks: true } } },
        });
        (0, response_1.successResponse)(res, { category }, 'Category updated');
    }
    catch (err) {
        console.error('UpdateCategory error:', err);
        (0, response_1.errorResponse)(res, 'Failed to update category', 500);
    }
}
// DELETE /categories/:id
async function deleteCategory(req, res) {
    try {
        const existing = await prisma_1.prisma.category.findFirst({
            where: { id: req.params.id, userId: req.userId },
        });
        if (!existing) {
            (0, response_1.errorResponse)(res, 'Category not found', 404);
            return;
        }
        // Unlink tasks from this category before deleting
        await prisma_1.prisma.task.updateMany({
            where: { categoryId: req.params.id, userId: req.userId },
            data: { categoryId: null },
        });
        await prisma_1.prisma.category.delete({ where: { id: req.params.id } });
        (0, response_1.successResponse)(res, null, 'Category deleted');
    }
    catch (err) {
        console.error('DeleteCategory error:', err);
        (0, response_1.errorResponse)(res, 'Failed to delete category', 500);
    }
}
//# sourceMappingURL=category.controller.js.map