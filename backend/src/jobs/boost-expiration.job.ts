// Boost expiration cron job — deactivates expired property boosts
import cron from 'node-cron';
import { boostsService } from '../modules/boosts/boosts.service';
import { logger } from '../common/utils/logger';

export function startBoostExpirationJob(): void {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Running boost expiration job...');
    try {
      const count = await boostsService.expireBoosts();
      if (count > 0) {
        logger.info(`Boost expiration: deactivated ${count} expired boosts`);
      }
    } catch (err) {
      logger.error('Boost expiration job failed', err);
    }
  });

  logger.info('Boost expiration job scheduled (every hour)');
}
