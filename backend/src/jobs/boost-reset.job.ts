// Boost reset cron — 1er de chaque mois à 04:00 : réinitialise les compteurs de boosts gratuits
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';

/**
 * Réinitialise le compteur mensuel de boosts GRATUITS (boostsFreeUsedThisMonth → 0)
 * pour les abonnements actifs Business (2/mois) et Entreprise (7/mois).
 *
 * N'affecte JAMAIS les boosts payants : ceux-ci sont stockés dans la table `boost`
 * (avec leur propre date d'expiration) et ne sont pas liés à ce compteur. Le reset
 * ne touche que le champ `subscription.boostsFreeUsedThisMonth`.
 *
 * @returns le nombre d'abonnements réinitialisés
 */
export async function resetFreeBoosts(): Promise<number> {
  const result = await prisma.subscription.updateMany({
    where: {
      status:   'active',
      planType: { in: ['business', 'entreprise'] },
      boostsFreeUsedThisMonth: { gt: 0 },
    },
    data: { boostsFreeUsedThisMonth: 0 },
  });

  logger.info(`Boost reset : ${result.count} abonnement(s) réinitialisé(s)`);
  return result.count;
}

export function startBoostResetJob(): void {
  // 1er de chaque mois à 04:00
  cron.schedule('0 4 1 * *', async () => {
    logger.info('Boost reset mensuel démarré');
    try {
      await resetFreeBoosts();
    } catch (err) {
      logger.error('Boost reset job échoué', err);
    }
  });

  logger.info('Boost reset programmé (1er du mois à 04:00)');
}
