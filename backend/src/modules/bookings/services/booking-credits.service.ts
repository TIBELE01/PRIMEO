// Restitution de ce qu'une réservation a prélevé à sa création : crédit du
// portefeuille et utilisation du code promo.
//
// Ces prélèvements ont lieu AVANT le paiement en ligne. Si la réservation
// n'aboutit pas (paiement refusé, expiré, initiation impossible, annulation
// avant paiement), ils doivent être rendus au client.
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../../database/prisma.service';
import { walletService } from '../../wallets/wallets.service';
import { logger } from '../../../common/utils/logger';

type Db = PrismaClient | Prisma.TransactionClient;

export interface ReleasedCredits {
  walletRefunded: number; // FCFA recrédités sur le portefeuille
  promoReleased: boolean; // utilisation du code promo rendue
}

async function releaseWithin(bookingId: string, db: Prisma.TransactionClient): Promise<ReleasedCredits> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { clientId: true, walletDeduction: true, promoCodeId: true },
  });
  if (!booking) return { walletRefunded: 0, promoReleased: false };

  let walletRefunded = 0;
  let promoReleased = false;

  if (booking.walletDeduction > 0) {
    // Prise atomique : la remise à zéro conditionnelle garantit qu'un seul
    // appelant (webhook, job d'expiration, annulation…) recrédite le montant.
    const claimed = await db.booking.updateMany({
      where: { id: bookingId, walletDeduction: booking.walletDeduction },
      data: { walletDeduction: 0 },
    });
    if (claimed.count === 1) {
      await walletService.credit(booking.clientId, booking.walletDeduction, db);
      walletRefunded = booking.walletDeduction;
    }
  }

  if (booking.promoCodeId) {
    const claimed = await db.booking.updateMany({
      where: { id: bookingId, promoCodeId: booking.promoCodeId },
      data: { promoCodeId: null },
    });
    if (claimed.count === 1) {
      // usesCount > 0 : ne jamais passer en négatif
      await db.promoCode.updateMany({
        where: { id: booking.promoCodeId, usesCount: { gt: 0 } },
        data: { usesCount: { decrement: 1 } },
      });
      promoReleased = true;
    }
  }

  if (walletRefunded > 0 || promoReleased) {
    logger.info('Crédits de réservation restitués', { bookingId, walletRefunded, promoReleased });
  }
  return { walletRefunded, promoReleased };
}

export const bookingCreditsService = {
  /**
   * Rend au client le crédit portefeuille et l'utilisation de code promo prélevés
   * à la création de la réservation. Idempotent : un second appel ne rend rien.
   * Passer `db` pour l'inclure dans une transaction Prisma en cours.
   */
  async release(bookingId: string, db?: Db): Promise<ReleasedCredits> {
    if (db && !('$transaction' in db)) {
      return releaseWithin(bookingId, db as Prisma.TransactionClient);
    }
    return prisma.$transaction((tx) => releaseWithin(bookingId, tx));
  },
};
