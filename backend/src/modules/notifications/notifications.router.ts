// Notifications routes — in-app notifications + channel preferences + push token
import { Router } from 'express';
import {
  listNotifications,
  markRead,
  markAllRead,
  getPreferences,
  updatePreferences,
  registerPushToken,
} from './notifications.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { parseId } from '../../common/validators/parse-id.middleware';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

// Specific paths before /:id to avoid shadowing
notificationsRouter.get('/preferences', getPreferences);
notificationsRouter.patch('/preferences', updatePreferences);
notificationsRouter.post('/push-token', registerPushToken);
notificationsRouter.post('/read-all', markAllRead);

// In-app list and per-item read
notificationsRouter.get('/', listNotifications);
notificationsRouter.post('/:id/read', parseId, markRead);
