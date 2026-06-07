// Service de remboursement — délègue à l'API Genius Pay (auth X-API-Key / X-API-Secret)
import { geniusPayService } from './genius-pay.service';
import { prisma } from '../../../database/prisma.service';
import { HttpError } from '../../../common/handlers/http-error.handler';
import { logger } from '../../../common/utils/logger';

export const refundService = {
  /**
   * Rembourse (totalement ou partiellement) une transaction réussie via Genius Pay.
   * - Vérifie l'éligibilité (statut success + référence Genius Pay présente).
   * - Appelle geniusPayService.refundPayment qui utilise les bons en-têtes
   *   d'authentification (X-API-Key / X-API-Secret) et le bon payload.
   * - Met à jour le statut de la transaction et trace une transaction de type refund.
   */
  async initiateRefund(transactionId: string, amount: number, reason = 'Remboursement Primeo'): Promise<{ reference: string }> {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) throw new HttpError(404, 'Transaction introuvable');
    if (tx.status !== 'success') throw new HttpError(400, 'Transaction non éligible au remboursement');
    if (!tx.geniusPayTransactionId) throw new HttpError(400, 'Aucune référence de paiement Genius Pay');
    if (amount <= 0 || amount > tx.amount) {
      throw new HttpError(400, 'Montant de remboursement invalide');
    }

    try {
      const { reference } = await geniusPayService.refundPayment({
        originalReference: tx.geniusPayTransactionId,
        amount,
        reason,
      });

      // Marque la transaction d'origine comme remboursée
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'refunded', completedAt: new Date() },
      });

      // Trace une transaction dédiée de type refund (montant négatif pour la compta)
      await prisma.transaction.create({
        data: {
          userId: tx.userId,
          type: 'refund',
          amount,
          fee: 0,
          netAmount: amount,
          status: 'success',
          bookingId: tx.bookingId,
          subscriptionId: tx.subscriptionId,
          geniusPayTransactionId: reference || tx.geniusPayTransactionId,
          notes: `Remboursement de la transaction ${transactionId} — ${reason}`,
          completedAt: new Date(),
        },
      });

      logger.info(`Remboursement effectué : transaction=${transactionId}, montant=${amount} XOF, ref=${reference}`);
      return { reference };
    } catch (err) {
      logger.error(`Échec du remboursement de la transaction ${transactionId}`, err);
      throw new HttpError(502, 'Le remboursement Genius Pay a échoué. Réessayez plus tard.');
    }
  },
};
