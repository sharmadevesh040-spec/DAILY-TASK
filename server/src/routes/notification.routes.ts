import { Router } from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getVapidKey,
  subscribePush,
  unsubscribePush,
  broadcastAppNotification,
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationAsRead);
router.patch('/read-all', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);
router.get('/vapid-public-key', getVapidKey);
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);
router.post('/broadcast', broadcastAppNotification);

export default router;
