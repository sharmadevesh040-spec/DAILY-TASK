import { Router } from 'express';
import { body } from 'express-validator';
import { getReminders, createReminder, deleteReminder } from '../controllers/reminder.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', getReminders);

router.post(
  '/',
  [
    body('taskId').notEmpty().withMessage('Task ID is required'),
    body('reminderTime').isISO8601().withMessage('Valid reminder time is required'),
  ],
  validate,
  createReminder
);

router.delete('/:id', deleteReminder);

export default router;
