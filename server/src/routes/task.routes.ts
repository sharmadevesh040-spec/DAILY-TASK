import { Router } from 'express';
import { body } from 'express-validator';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getTodayTasks,
} from '../controllers/task.controller';
import {
  submitTaskCompletionPhoto,
  getTaskProofs,
  uploadMiddleware,
} from '../controllers/taskProof.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/today', getTodayTasks);
router.get('/', getTasks);
router.get('/:id', getTask);

router.post(
  '/',
  [body('title').trim().notEmpty().withMessage('Title is required')],
  validate,
  createTask
);

router.put(
  '/:id',
  [body('title').optional().trim().notEmpty().withMessage('Title cannot be empty')],
  validate,
  updateTask
);

router.delete('/:id', deleteTask);

router.patch(
  '/:id/status',
  [
    body('status')
      .isIn(['TODO', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'PENDING_VERIFICATION'])
      .withMessage('Invalid status'),
  ],
  validate,
  updateTaskStatus
);

// FEATURE 1: Submit completion photo for verification
router.post(
  '/:id/submit-completion',
  uploadMiddleware.single('photo'),
  submitTaskCompletionPhoto
);

// Get task proof history
router.get('/:id/proofs', getTaskProofs);

export default router;
