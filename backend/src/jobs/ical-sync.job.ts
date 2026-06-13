// Synchronisation des calendriers iCal externes (Airbnb/Booking) — toutes les 6h.
// Réconcilie les blocages `external_blocked` sans toucher aux réservations internes.
import cron from 'node-cron';
import { availabilitiesService } from '../modules/availabilities/availabilities.service';
import { logger } from '../common/utils/logger';

export function startIcalSyncJob(): void {
  // Toutes les 6 heures (00:15, 06:15, 12:15, 18:15)
  cron.schedule('15 */6 * * *', async () => {
    logger.info('Running iCal external sync job...');
    try {
      const { properties } = await availabilitiesService.syncAllFeeds();
      if (properties > 0) logger.info(`iCal sync: ${properties} propriété(s) synchronisée(s)`);
      else logger.debug('iCal sync: aucun flux configuré');
    } catch (err) {
      logger.error('iCal sync job failed', err);
    }
  });

  logger.info('iCal external sync job scheduled (every 6h)');
}
