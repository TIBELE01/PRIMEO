// Rappels de séjour J-7 et J-1 — cron quotidien 09:00 UTC.
// Notifie (push + in-app) chaque client dont une réservation confirmée commence
// dans 7 jours ou demain (séjours ET tables de restaurant). Idempotent : un rappel déjà émis
// pour une réservation (notification stay_reminder portant son bookingId)
// n'est pas renvoyé.
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { notificationsService } from '../modules/notifications/notifications.service';
import { logger } from '../common/utils/logger';

const DAY_MS = 24 * 60 * 60 * 1000;
const fmt = (d: Date) => d.toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Rappels J-7 et J-1 (séjours et tables). Idempotent par réservation et par échéance. */
export async function runStayReminders(): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  for (const daysBefore of [7, 1] as const) {
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() + daysBefore);
    const to = new Date(from.getTime() + DAY_MS);
    const reminder = daysBefore === 7 ? 'J-7' : 'J-1';

    const bookings = await prisma.booking.findMany({
      where: { status: 'confirmed', startDate: { gte: from, lt: to } },
      select: { id: true, clientId: true, startDate: true, endDate: true, property: { select: { title: true } } },
    });

    for (const b of bookings) {
      // Garde d'idempotence : rappel de cette échéance déjà envoyé pour cette réservation ?
      // (les anciens rappels sans champ « reminder » sont des J-1)
      const already = await prisma.notification.findFirst({
        where: {
          userId: b.clientId,
          type: 'stay_reminder',
          data: { path: ['bookingId'], equals: b.id },
          ...(daysBefore === 7
            ? { AND: [{ data: { path: ['reminder'], equals: 'J-7' } }] }
            : { NOT: { data: { path: ['reminder'], equals: 'J-7' } } }),
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
          reminder,
          daysBefore: String(daysBefore),
          propertyTitle: b.property.title,
          startDate: fmt(b.startDate),
          endDate: fmt(b.endDate),
        },
      }).catch((err) => logger.warn(`Stay reminder ${reminder} failed for booking ${b.id}`, err));
      sent += 1;
    }
  }

  return { sent, skipped };
}

export function startStayReminderJob(): void {
  // Tous les jours à 09:00 UTC (heure locale CI = UTC ; matinée côté utilisateur)
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running stay reminder job (J-7 / J-1)...');
    try {
      const { sent, skipped } = await runStayReminders();
      if (sent > 0 || skipped > 0) logger.info(`Stay reminders: sent=${sent} skipped=${skipped}`);
      else logger.debug('Stay reminders: no bookings starting in 7 days or tomorrow');
    } catch (err) {
      logger.error('Stay reminder job failed', err);
    }
  });

  logger.info('Stay reminder job scheduled (daily at 09:00)');
}
