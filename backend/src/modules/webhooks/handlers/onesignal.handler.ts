// OneSignal webhook handler — push delivery and subscription events
import { prisma } from '../../../database/prisma.service';
import { logger } from '../../../common/utils/logger';

export interface OneSignalEvent {
  event: string;
  userId: string;
  notificationId: string;
  /** OneSignal player/subscription id (présent sur les évènements d'abonnement). */
  playerId?: string;
}

/**
 * Désabonnement : purge le(s) token(s) push de l'utilisateur pour ne plus tenter
 * d'envoi. Si un playerId précis est fourni, on ne cible que celui-ci ; sinon on
 * supprime tous les tokens de l'utilisateur. On nettoie aussi le champ legacy
 * User.onesignalPlayerId.
 */
async function purgePushTokens(userId: string, playerId?: string): Promise<void> {
  try {
    const where = playerId ? { userId, playerId } : { userId };
    const deleted = await prisma.pushToken.deleteMany({ where });

    if (playerId) {
      await prisma.user.updateMany({
        where: { id: userId, onesignalPlayerId: playerId },
        data: { onesignalPlayerId: null },
      });
    } else {
      await prisma.user.update({ where: { id: userId }, data: { onesignalPlayerId: null } })
        .catch(() => null);
    }

    logger.info(`OneSignal unsubscribe: ${deleted.count} token(s) purgé(s) pour user ${userId}`);
  } catch (err) {
    logger.warn(`OneSignal unsubscribe: échec purge tokens user ${userId}`, err);
  }
}

export async function handleOneSignalEvent(event: OneSignalEvent): Promise<void> {
  switch (event.event) {
    case 'notification.delivered':
      logger.debug(`Push delivered to user ${event.userId}`);
      break;
    case 'notification.clicked':
      logger.debug(`Push clicked by user ${event.userId}`);
      break;
    case 'device.unsubscribed':
      logger.info(`User ${event.userId} unsubscribed from push notifications`);
      await purgePushTokens(event.userId, event.playerId);
      break;
    default:
      logger.debug(`OneSignal event: ${event.event}`);
  }
}
