import { Router } from 'express';
import { getDashboardStats, getStreak, getCalendarTasks } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/streak', getStreak);
router.get('/calendar', getCalendarTasks);

export default router;
