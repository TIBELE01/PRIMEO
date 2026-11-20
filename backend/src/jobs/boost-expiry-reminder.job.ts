// Rappel 24h avant expiration d'un boost — cron horaire.
// Notifie (email + push + in-app) le propriétaire dont le boost expire dans les
// prochaines 24h. Idempotent : vérifie la table notifications avant d'envoyer.
// (Auparavant : un passage quotidien à 10:00 sur une fenêtre de 24h–25h ne
// rattrapait que les boosts expirant entre 10:00 et 11:00 le lendemain.)
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { notificationsService } from '../modules/notifications/notifications.service';
import { logger } from '../common/utils/logger';

export async function runBoostExpiryReminders(): Promise<{ sent: number; skipped: number }> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Boosts en cours qui expirent dans les prochaines 24h (un seul rappel par boost)
  const boosts = await prisma.boost.findMany({
    where: {
      endDate: { gt: now, lte: in24h },
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
  cron.schedule('15 * * * *', async () => {
    logger.info('Running boost expiry reminder job (J-1)...');
    try {
      const { sent, skipped } = await runBoostExpiryReminders();
      if (sent > 0 || skipped > 0) logger.info(`Boost expiry reminders: sent=${sent} skipped=${skipped}`);
      else logger.debug('Boost expiry reminders: no boosts expiring tomorrow');
    } catch (err) {
      logger.error('Boost expiry reminder job failed', err);
    }
  });

  logger.info('Boost expiry reminder job scheduled (hourly)');
}
