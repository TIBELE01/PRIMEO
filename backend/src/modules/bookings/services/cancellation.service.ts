// Cancellation policy — computes refund eligibility based on days until check-in
import type { Booking } from '@prisma/client';

export interface CancellationResult {
  refundAmount: number;   // FCFA
  refundPercent: number;  // 0 | 50 | 100
}

export const cancellationService = {
  /**
   * Barème selon les jours restant avant l'arrivée (annulation par le client).
   * Quand l'annulation vient du professionnel ou d'un administrateur, le client
   * n'est pas fautif : remboursement intégral, quelle que soit la date.
   */
  computeRefund(booking: Booking, cancelledBy: 'client' | 'professional' | 'admin' = 'client'): CancellationResult {
    if (cancelledBy !== 'client') return { refundAmount: booking.onlinePaidAmount, refundPercent: 100 };
    const daysUntil = Math.ceil(
      (new Date(booking.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil >= 7) return { refundAmount: booking.onlinePaidAmount, refundPercent: 100 };
    if (daysUntil >= 3) return { refundAmount: Math.floor(booking.onlinePaidAmount * 0.5), refundPercent: 50 };
    return { refundAmount: 0, refundPercent: 0 };
  },
};
