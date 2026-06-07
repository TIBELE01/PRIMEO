// Tests unitaires — cancellationService.computeRefund (politique d'annulation)
import { cancellationService } from './cancellation.service';
import type { Booking } from '@prisma/client';

function bookingInDays(days: number, onlinePaid = 10000): Booking {
  const startDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return { startDate, onlinePaidAmount: onlinePaid } as Booking;
}

describe('cancellationService.computeRefund', () => {
  it('rembourse 100 % si annulation ≥ 7 jours avant le séjour', () => {
    expect(cancellationService.computeRefund(bookingInDays(10))).toEqual({ refundAmount: 10000, refundPercent: 100 });
  });

  it('rembourse 50 % entre 3 et 6 jours avant', () => {
    expect(cancellationService.computeRefund(bookingInDays(4))).toEqual({ refundAmount: 5000, refundPercent: 50 });
  });

  it('ne rembourse rien à moins de 3 jours', () => {
    expect(cancellationService.computeRefund(bookingInDays(1))).toEqual({ refundAmount: 0, refundPercent: 0 });
  });

  it('arrondit à l\'entier inférieur pour le palier 50 %', () => {
    expect(cancellationService.computeRefund(bookingInDays(5, 9999))).toEqual({ refundAmount: 4999, refundPercent: 50 });
  });

  it('frontière : exactement 7 jours → 100 %', () => {
    // 7 jours pile (Math.ceil peut donner 7) → palier 100 %
    expect(cancellationService.computeRefund(bookingInDays(7)).refundPercent).toBe(100);
  });
});
