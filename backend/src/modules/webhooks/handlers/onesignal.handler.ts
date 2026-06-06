// OneSignal webhook handler — push delivery and subscription events
import { logger } from '../../../common/utils/logger';

export interface OneSignalEvent {
  event: string;
  userId: string;
  notificationId: string;
}

export function handleOneSignalEvent(event: OneSignalEvent): void {
  switch (event.event) {
    case 'notification.delivered':
      logger.debug(`Push delivered to user ${event.userId}`);
      break;
    case 'notification.clicked':
      logger.debug(`Push clicked by user ${event.userId}`);
      break;
    case 'device.unsubscribed':
      logger.info(`User ${event.userId} unsubscribed from push notifications`);
      // TODO: remove OneSignal player ID from user record
      break;
    default:
      logger.debug(`OneSignal event: ${event.event}`);
  }
}
