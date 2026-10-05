import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

// GET /categories
export async function getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { name: 'asc' },
    });

    successResponse(res, { categories });
  } catch (err) {
    console.error('GetCategories error:', err);
    errorResponse(res, 'Failed to fetch categories', 500);
  }
}

// POST /categories
export async function createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, color } = req.body;

    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId: req.userId!, name } },
    });

    if (existing) {
      errorResponse(res, 'Category with this name already exists', 409);
      return;
    }

    const category = await prisma.category.create({
      data: { userId: req.userId!, name, color: color || '#6366f1' },
      include: { _count: { select: { tasks: true } } },
    });

    successResponse(res, { category }, 'Category created', 201);
  } catch (err) {
    console.error('CreateCategory error:', err);
    errorResponse(res, 'Failed to create category', 500);
  }
}

// PUT /categories/:id
export async function updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      errorResponse(res, 'Category not found', 404);
      return;
    }

    const { name, color } = req.body;

    // Check name uniqueness if renaming
    if (name && name !== existing.name) {
      const nameTaken = await prisma.category.findUnique({
        where: { userId_name: { userId: req.userId!, name } },
      });
      if (nameTaken) {
        errorResponse(res, 'Category with this name already exists', 409);
        return;
      }
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
      include: { _count: { select: { tasks: true } } },
    });

    successResponse(res, { category }, 'Category updated');
  } catch (err) {
    console.error('UpdateCategory error:', err);
    errorResponse(res, 'Failed to update category', 500);
  }
}

// DELETE /categories/:id
export async function deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      errorResponse(res, 'Category not found', 404);
      return;
    }

    // Unlink tasks from this category before deleting
    await prisma.task.updateMany({
      where: { categoryId: req.params.id, userId: req.userId },
      data: { categoryId: null },
    });

    await prisma.category.delete({ where: { id: req.params.id } });

    successResponse(res, null, 'Category deleted');
  } catch (err) {
    console.error('DeleteCategory error:', err);
    errorResponse(res, 'Failed to delete category', 500);
  }
}
