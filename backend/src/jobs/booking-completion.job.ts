// Clôture automatique des séjours — cron quotidien 03:30 UTC.
// Une réservation « confirmée » dont la date de départ est passée (la veille ou
// avant) passe automatiquement à « terminée » : le client peut alors laisser un
// avis et le professionnel peut évaluer le client. Les demandes d'intérêt
// immobilier et les réservations annulées ne sont pas concernées.
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { referralsService } from '../modules/referrals/referrals.service';
import { logger } from '../common/utils/logger';

export async function runBookingCompletion(now: Date = new Date()): Promise<{ completed: number }> {
  // Début de la journée courante (UTC = heure d'Abidjan) : tout départ antérieur est « passé ».
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  const due = await prisma.booking.findMany({
    where: { status: 'confirmed', endDate: { lt: today } },
    select: { id: true, clientId: true },
  });
  if (due.length === 0) return { completed: 0 };

  const res = await prisma.booking.updateMany({
    where: { id: { in: due.map((b) => b.id) }, status: 'confirmed' },
    data: { status: 'completed' },
  });

  // Même effet de bord que la clôture manuelle : récompense de parrainage éventuelle
  // (le séjour est terminé et la date de départ passée : la condition client est remplie).
  for (const clientId of new Set(due.map((b) => b.clientId))) {
    await referralsService.triggerReward(clientId).catch((err) =>
      logger.warn(`Referral reward trigger failed on auto-complete for client ${clientId}`, err),
    );
  }
  return { completed: res.count };
}

export function startBookingCompletionJob(): void {
  cron.schedule('30 3 * * *', async () => {
    try {
      const { completed } = await runBookingCompletion();
      if (completed > 0) logger.info(`Booking completion: ${completed} réservation(s) terminée(s) automatiquement`);
    } catch (err) {
      logger.error('Booking completion job failed', err);
    }
  });
  logger.info('Booking completion job scheduled (daily at 03:30)');
}
