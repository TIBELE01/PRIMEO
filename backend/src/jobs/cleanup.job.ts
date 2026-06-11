// Cleanup cron job — archivage des logs d'audit et filets de sécurité
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';

export function startCleanupJob(): void {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running cleanup job...');
    try {
      // Conformité : les logs d'audit ne sont JAMAIS supprimés avant 1 an.
      // Au-delà, ils sont déplacés vers audit_logs_archive par la fonction DB
      // archive_old_audit_logs() (seule autorisée à contourner l'immuabilité).
      const archived = await prisma.$queryRaw<[{ archive_old_audit_logs: number }]>`
        SELECT archive_old_audit_logs()`;
      const count = archived[0]?.archive_old_audit_logs ?? 0;
      if (count > 0) logger.info(`Cleanup: ${count} log(s) d'audit archivé(s) (> 1 an)`);

      // Filet de sécurité : annule les réservations pending_payment de plus de 24h
      // qui auraient échappé au job d'expiration horaire (pending-payment-expiry.job.ts)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const cancelled = await prisma.booking.updateMany({
        where: {
          status: 'pending_payment',
          createdAt: { lt: oneDayAgo },
        },
        data: {
          status: 'cancelled_by_client',
          cancelledAt: new Date(),
          cancellationReason: 'Paiement non reçu — annulation de sécurité (24h)',
          cancelledBy: 'system',
        },
      });
      if (cancelled.count > 0) {
        logger.warn(`Cleanup: ${cancelled.count} réservation(s) annulée(s) par le filet de sécurité 24h`);
      }
    } catch (err) {
      logger.error('Cleanup job failed', err);
    }
  });

  logger.info('Cleanup job scheduled (daily at 02:00)');
}
