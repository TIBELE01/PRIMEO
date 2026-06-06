// Referral rewards reconciliation job — daily safety net that distributes any
// pending rewards that were missed by the inline trigger in bookings.service.
// Qualifying condition: referral status = 'pending' AND referee has ≥1 completed booking.
import cron from 'node-cron';
import { referralsService } from '../modules/referrals/referrals.service';
import { logger } from '../common/utils/logger';

export function startReferralRewardsJob(): void {
  // Run daily at 06:00 UTC
  cron.schedule('0 6 * * *', async () => {
    logger.info('Running referral rewards reconciliation job...');
    try {
      const { rewarded, errors } = await referralsService.reconcilePendingRewards();
      if (rewarded > 0 || errors > 0) {
        logger.info(`Referral rewards reconciliation: rewarded=${rewarded} errors=${errors}`);
      } else {
        logger.debug('Referral rewards reconciliation: no pending rewards found');
      }
    } catch (err) {
      logger.error('Referral rewards reconciliation job failed', err);
    }
  });

  logger.info('Referral rewards reconciliation job scheduled (daily at 06:00)');
}
