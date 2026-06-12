// Vérifie qu'une annulation utilisateur (client ou pro) notifie LES DEUX parties
// (booking_cancelled), avec l'auteur de l'annulation dans les données.
jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../config/env.config', () => ({ env: { FRONTEND_URL: 'http://app.test' } }));
jest.mock('./services/availability.service', () => ({ availabilityService: {} }));
jest.mock('./services/pricing.service', () => ({ pricingService: {} }));
jest.mock('./services/cancellation.service', () => ({
  cancellationService: { computeRefund: jest.fn(() => ({ refundAmount: 0 })) },
}));
jest.mock('../payments/services/genius-pay.service', () => ({ geniusPayService: {} }));
jest.mock('../webhooks/handlers/genius-pay.handler', () => ({
  processSuccessfulPayment: jest.fn(), processFailedPayment: jest.fn(), ensureBookingInvoice: jest.fn(),
}));
jest.mock('../notifications/notifications.service', () => ({
  notificationsService: { notify: jest.fn(async () => undefined) },
}));
jest.mock('../messaging/messaging.service', () => ({ messagingService: { saveMessage: jest.fn() } }));
jest.mock('../referrals/referrals.service', () => ({ referralsService: { triggerReward: jest.fn() } }));
jest.mock('../wallets/wallets.service', () => ({ walletService: { credit: jest.fn(), debit: jest.fn(), getBalance: jest.fn() } }));

const mockPrisma: Record<string, any> = {
  booking: { findUnique: jest.fn() },
};
mockPrisma.$transaction = jest.fn(async (cb: any) =>
  cb({
    booking: { update: jest.fn(async () => ({})) },
    transaction: { updateMany: jest.fn(async () => ({})), create: jest.fn(async () => ({})) },
  }),
);
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { bookingsService } from './bookings.service';
import { notificationsService } from '../notifications/notifications.service';

const CLIENT = 'client-1';
const OWNER = 'owner-1';
const baseBooking = {
  id: 'bk-1',
  clientId: CLIENT,
  status: 'confirmed',
  onlinePaidAmount: 0,
  startDate: new Date('2026-07-01'),
  endDate: new Date('2026-07-03'),
  property: { ownerId: OWNER, title: 'Villa Cocody' },
};

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.booking.findUnique.mockResolvedValue(baseBooking);
});

describe('bookingsService.cancel — notifications aux deux parties', () => {
  it('annulation par le client : notifie client ET professionnel (cancelledBy=client)', async () => {
    await bookingsService.cancel('bk-1', { sub: CLIENT, role: 'client' } as never, { reason: 'Imprévu' } as never);
    await flush();

    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_cancelled', recipientId: CLIENT,
      data: expect.objectContaining({ bookingId: 'bk-1', propertyTitle: 'Villa Cocody', cancelledBy: 'client' }),
    }));
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'booking_cancelled', recipientId: OWNER,
      data: expect.objectContaining({ cancelledBy: 'client' }),
    }));
  });

  it('annulation par le professionnel : cancelledBy=professional', async () => {
    await bookingsService.cancel('bk-1', { sub: OWNER, role: 'professional_hebergement' } as never, { reason: 'Travaux' } as never);
    await flush();
    expect(notificationsService.notify).toHaveBeenCalledTimes(2);
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: CLIENT, data: expect.objectContaining({ cancelledBy: 'professional' }),
    }));
  });
});
