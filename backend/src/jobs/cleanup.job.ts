// Cleanup cron job — removes expired OTPs and old audit logs
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';

export function startCleanupJob(): void {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running cleanup job...');
    try {
      // Remove audit logs older than 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const deleted = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: sixMonthsAgo } },
      });
      logger.info(`Cleanup: removed ${deleted.count} audit log entries`);

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
