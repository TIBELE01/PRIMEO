// Réconciliation des récompenses de parrainage — filet de sécurité HORAIRE : tout parrainage
// encore « pending » dont la condition est remplie (filleul client : séjour terminé ;
// filleul pro : KYC approuvé) passe à « rewarded » et le parrain est crédité.
// Les déclencheurs immédiats (clôture du séjour, paiement cash, KYC) restent la voie normale.
import cron from 'node-cron';
import { referralsService } from '../modules/referrals/referrals.service';
import { logger } from '../common/utils/logger';

export function startReferralRewardsJob(): void {
  // Toutes les heures (minute 7) : un statut ne reste jamais « en attente » plus d'une heure
  cron.schedule('7 * * * *', async () => {
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

  logger.info('Referral rewards reconciliation job scheduled (hourly)');
}
