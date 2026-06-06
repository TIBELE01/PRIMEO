// Cancellation policy — computes refund eligibility based on days until check-in
import type { Booking } from '@prisma/client';

export interface CancellationResult {
  refundAmount: number;   // FCFA
  refundPercent: number;  // 0 | 50 | 100
}

export const cancellationService = {
  computeRefund(booking: Booking): CancellationResult {
    const daysUntil = Math.ceil(
      (new Date(booking.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil >= 7) return { refundAmount: booking.onlinePaidAmount, refundPercent: 100 };
    if (daysUntil >= 3) return { refundAmount: Math.floor(booking.onlinePaidAmount * 0.5), refundPercent: 50 };
    return { refundAmount: 0, refundPercent: 0 };
  },
};
