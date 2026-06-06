// Boost reset cron — 1er de chaque mois à 04:00 : réinitialise les compteurs de boosts gratuits
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';

export function startBoostResetJob(): void {
  // 1er de chaque mois à 04:00
  cron.schedule('0 4 1 * *', async () => {
    logger.info('Boost reset mensuel démarré');
    try {
      // Reset pour Business (2/mois) et Entreprise (7/mois)
      const result = await prisma.subscription.updateMany({
        where: {
          status:   'active',
          planType: { in: ['business', 'entreprise'] },
          boostsFreeUsedThisMonth: { gt: 0 },
        },
        data: { boostsFreeUsedThisMonth: 0 },
      });

      logger.info(`Boost reset : ${result.count} abonnement(s) réinitialisé(s)`);
    } catch (err) {
      logger.error('Boost reset job échoué', err);
    }
  });

  logger.info('Boost reset programmé (1er du mois à 04:00)');
}
