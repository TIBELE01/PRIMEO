// Reversements automatiques aux professionnels — cron quotidien.
// Crédite le portefeuille de chaque pro du net (après frais Genius Pay) des
// réservations confirmées payées en ligne, non encore reversées. Idempotent.
import cron from 'node-cron';
import { payoutsService } from '../modules/payouts/payouts.service';
import { logger } from '../common/utils/logger';

export function startPayoutsJob(): void {
  // Tous les jours à 05:00 UTC (après l'expiration des paiements en attente).
  cron.schedule('0 5 * * *', async () => {
    logger.info('Running professional payouts job...');
    try {
      const { processed, totalNet, errors } = await payoutsService.runDailyPayouts();
      if (processed > 0 || errors > 0) {
        logger.info(`Professional payouts: processed=${processed} totalNet=${totalNet} errors=${errors}`);
      } else {
        logger.debug('Professional payouts: no eligible bookings');
      }
    } catch (err) {
      logger.error('Professional payouts job failed', err);
    }
  });

  logger.info('Professional payouts job scheduled (daily at 05:00)');
}
