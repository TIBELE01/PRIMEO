// Push provider — queries push_tokens table, dispatches via OneSignal or Expo Push API,
// and cleans up invalid / unregistered tokens automatically.
import { prisma } from '../../../database/prisma.service';
import { sendViaOneSignal, sendViaExpoPush, PushPayload } from '../../../common/utils/push';
import { logger } from '../../../common/utils/logger';
import { NotificationType } from '../notifications.types';

export const pushProvider = {
  async sendToUser(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data: Record<string, unknown>,
    priority: 'high' | 'normal',
  ): Promise<void> {
    const tokens = await prisma.pushToken.findMany({
      where: { userId, isActive: true },
    });

    if (!tokens.length) return;

    const payload: PushPayload = {
      headings: { en: title, fr: title },
      contents: { en: body,  fr: body  },
      data: { type, ...data },
      priority,
    };

    // Separate OneSignal-registered devices from raw Expo-token devices
    const withPlayerId  = tokens.filter((t) => t.playerId);
    const withExpoToken = tokens.filter((t) => !t.playerId);

    // OneSignal path
    if (withPlayerId.length) {
      const playerIds = withPlayerId.map((t) => t.playerId!);
      const { invalidIds } = await sendViaOneSignal(playerIds, payload);
      if (invalidIds.length) {
        await prisma.pushToken.updateMany({
          where: { userId, playerId: { in: invalidIds } },
          data: { isActive: false },
        });
        logger.info(`Deactivated ${invalidIds.length} invalid OneSignal token(s) for user ${userId}`);
      }
    }

    // Expo push path (fallback for devices without a OneSignal player_id)
    if (withExpoToken.length) {
      const expoTokens = withExpoToken.map((t) => t.token);
      const { badTokens } = await sendViaExpoPush(expoTokens, title, body, { type, ...data }, priority);
      if (badTokens.length) {
        await prisma.pushToken.updateMany({
          where: { userId, token: { in: badTokens } },
          data: { isActive: false },
        });
        logger.info(`Deactivated ${badTokens.length} invalid Expo token(s) for user ${userId}`);
      }
    }
  },
};
