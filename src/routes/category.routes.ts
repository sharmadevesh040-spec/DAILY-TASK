import { Router } from 'express';
import { body } from 'express-validator';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', getCategories);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('color').optional().isHexColor().withMessage('Invalid color format'),
  ],
  validate,
  createCategory
);

router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('color').optional().isHexColor().withMessage('Invalid color format'),
  ],
  validate,
  updateCategory
);

router.delete('/:id', deleteCategory);

export default router;
