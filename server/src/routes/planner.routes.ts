import { Router } from 'express';
import { body } from 'express-validator';
import {
  generatePlan,
  applyPlan,
  getRescheduleSuggestions,
  applyReschedule,
  joinAutoScheduleWaitlist,
} from '../controllers/planner.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.post(
  '/generate',
  [body('prompt').trim().notEmpty().withMessage('Prompt cannot be empty')],
  validate,
  generatePlan
);

router.post(
  '/apply',
  [body('tasks').isArray({ min: 1 }).withMessage('Tasks array required')],
  validate,
  applyPlan
);

router.post('/reschedule-suggestions', getRescheduleSuggestions);

router.post(
  '/apply-reschedule',
  [body('reschedules').isArray({ min: 1 }).withMessage('Reschedules array required')],
  validate,
  applyReschedule
);

// Coming Soon: Join waitlist for Automatic AI Schedule
router.post('/waitlist', joinAutoScheduleWaitlist);

export default router;
