// Rappel 24h avant expiration d'un boost — cron quotidien 10:00 UTC.
// Notifie (email + push + in-app) le propriétaire dont le boost expire
// dans les prochaines 24h. Idempotent : vérifie la table notifications
// avant d'envoyer.
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { notificationsService } from '../modules/notifications/notifications.service';
import { logger } from '../common/utils/logger';

export async function runBoostExpiryReminders(): Promise<{ sent: number; skipped: number }> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  // Find boosts expiring in the 24h-25h window (so we only catch them once)
  const boosts = await prisma.boost.findMany({
    where: {
      endDate: { gte: in24h, lt: in25h },
      property: { isBoosted: true },
    },
    select: {
      id: true,
      userId: true,
      endDate: true,
      property: { select: { title: true } },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const b of boosts) {
    // Idempotence guard
    const already = await prisma.notification.findFirst({
      where: {
        userId: b.userId,
        type: 'boost_expiry_reminder',
        data: { path: ['boostId'], equals: b.id },
      },
      select: { id: true },
    });
    if (already) {
      skipped += 1;
      continue;
    }

    await notificationsService.notify({
      type: 'boost_expiry_reminder',
      recipientId: b.userId,
      data: {
        boostId: b.id,
        propertyTitle: b.property.title,
        expiresAt: b.endDate.toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
      },
    }).catch((err) => logger.warn(`Boost expiry reminder failed for boost ${b.id}`, err));
    sent += 1;
  }

  return { sent, skipped };
}

export function startBoostExpiryReminderJob(): void {
  cron.schedule('0 10 * * *', async () => {
    logger.info('Running boost expiry reminder job (J-1)...');
    try {
      const { sent, skipped } = await runBoostExpiryReminders();
      if (sent > 0 || skipped > 0) logger.info(`Boost expiry reminders: sent=${sent} skipped=${skipped}`);
      else logger.debug('Boost expiry reminders: no boosts expiring tomorrow');
    } catch (err) {
      logger.error('Boost expiry reminder job failed', err);
    }
  });

  logger.info('Boost expiry reminder job scheduled (daily at 10:00)');
}
