// Rappel de séjour J-1 — cron quotidien 09:00 UTC.
// Notifie (push + in-app) chaque client dont une réservation confirmée commence
// demain (séjours ET tables de restaurant). Idempotent : un rappel déjà émis
// pour une réservation (notification stay_reminder portant son bookingId)
// n'est pas renvoyé.
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { notificationsService } from '../modules/notifications/notifications.service';
import { logger } from '../common/utils/logger';

export async function runStayReminders(): Promise<{ sent: number; skipped: number }> {
  const tomorrow = new Date();
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dayAfter = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'confirmed',
      startDate: { gte: tomorrow, lt: dayAfter },
    },
    select: {
      id: true,
      clientId: true,
      startDate: true,
      property: { select: { title: true } },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const b of bookings) {
    // Garde d'idempotence : rappel déjà envoyé pour cette réservation ?
    const already = await prisma.notification.findFirst({
      where: {
        userId: b.clientId,
        type: 'stay_reminder',
        data: { path: ['bookingId'], equals: b.id },
      },
      select: { id: true },
    });
    if (already) {
      skipped += 1;
      continue;
    }

    await notificationsService.notify({
      type: 'stay_reminder',
      recipientId: b.clientId,
      data: {
        bookingId: b.id,
        propertyTitle: b.property.title,
        startDate: b.startDate.toLocaleDateString('fr-CI', { day: 'numeric', month: 'long' }),
      },
    }).catch((err) => logger.warn(`Stay reminder failed for booking ${b.id}`, err));
    sent += 1;
  }

  return { sent, skipped };
}

export function startStayReminderJob(): void {
  // Tous les jours à 09:00 UTC (heure locale CI = UTC ; matinée côté utilisateur)
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running stay reminder job (J-1)...');
    try {
      const { sent, skipped } = await runStayReminders();
      if (sent > 0 || skipped > 0) logger.info(`Stay reminders: sent=${sent} skipped=${skipped}`);
      else logger.debug('Stay reminders: no bookings starting tomorrow');
    } catch (err) {
      logger.error('Stay reminder job failed', err);
    }
  });

  logger.info('Stay reminder job scheduled (daily at 09:00)');
}
