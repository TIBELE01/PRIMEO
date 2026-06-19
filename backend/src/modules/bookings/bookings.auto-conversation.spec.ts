// Tests de l'ouverture automatique de conversation + notifications à la création
// d'une réservation. Couvre les deux flux à confirmation immédiate :
//   - Restaurant : réservation de table → message auto structuré + notify(new_booking, booking_confirmed)
//   - Immobilier : expression d'intérêt → message auto structuré + notify(interest_booking_received, interest_submitted)
// Le flux paiement en ligne (webhook Genius Pay) est couvert par
// genius-pay.auto-conversation.spec.ts.
jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../config/env.config', () => ({ env: { FRONTEND_URL: 'http://app.test' } }));
jest.mock('./services/availability.service', () => ({
  availabilityService: { checkRestaurantCapacity: jest.fn(async () => undefined), checkDatesAvailable: jest.fn(async () => undefined) },
}));
jest.mock('./services/pricing.service', () => ({ pricingService: { compute: jest.fn() } }));
jest.mock('./services/cancellation.service', () => ({ cancellationService: { computeRefund: jest.fn() } }));
jest.mock('../payments/services/genius-pay.service', () => ({ geniusPayService: { initiatePayment: jest.fn() } }));
jest.mock('../webhooks/handlers/genius-pay.handler', () => ({
  processSuccessfulPayment: jest.fn(), processFailedPayment: jest.fn(), ensureBookingInvoice: jest.fn(async () => null),
}));
jest.mock('../notifications/notifications.service', () => ({
  notificationsService: { notify: jest.fn(async () => undefined) },
}));
jest.mock('../messaging/messaging.service', () => ({
  messagingService: {
    saveMessage: jest.fn(async () => ({ id: 'msg-1' })),
    saveAutoBookingMessage: jest.fn(async () => ({ id: 'msg-auto' })),
  },
}));
jest.mock('../referrals/referrals.service', () => ({ referralsService: { triggerReward: jest.fn(async () => undefined) } }));
jest.mock('../wallets/wallets.service', () => ({
  walletService: { getBalance: jest.fn(async () => 0), debit: jest.fn(), credit: jest.fn() },
}));

const mockPrisma: Record<string, any> = {
  user:    { findUnique: jest.fn(), update: jest.fn(async (a: any) => ({ id: 'client-1', ...a.data })) },
  property:{ findUnique: jest.fn() },
  booking: { create: jest.fn(async () => ({ id: 'bk-interest' })) },
};
mockPrisma.$transaction = jest.fn(async (cb: any) =>
  cb({
    booking:     { create: jest.fn(async () => ({ id: 'bk-resto' })) },
    transaction: { create: jest.fn(async () => ({})) },
    promoCode:   { update: jest.fn(async () => ({})) },
  }),
);
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { bookingsService } from './bookings.service';
import { notificationsService } from '../notifications/notifications.service';
import { messagingService } from '../messaging/messaging.service';

const CLIENT = 'client-1';
const OWNER = 'owner-1';
const client = { id: CLIENT, firstName: 'Koffi', lastName: 'Assi', phone: '+2250700000001', email: 'koffi@test.ci' };

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue(client);
});

describe('Réservation restaurant — conversation auto + notifications', () => {
  it('crée le message automatique structuré et notifie le client ET le professionnel', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({
      id: 'prop-resto', ownerId: OWNER, propertyType: 'restaurant', status: 'active', capacity: 50, title: 'La Saveur du Monde',
    });

    const start = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await bookingsService.create(CLIENT, {
      propertyId: 'prop-resto', startDate: start, endDate: start, guests: 2,
      paymentOption: 'zero_online', reservationTime: '19:30',
    } as never);
    await flush();

    // Message automatique structuré via saveAutoBookingMessage
    expect(messagingService.saveAutoBookingMessage).toHaveBeenCalledWith('bk-resto');
    // Notifications : nouvelle réservation au pro + confirmation au client
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'new_booking', recipientId: OWNER }));
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'booking_confirmed', recipientId: CLIENT }));
  });
});

describe('Immobilier — expression d\'intérêt : conversation auto + notifications', () => {
  it('crée le message automatique structuré et notifie le client ET le professionnel', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({
      id: 'prop-immo', ownerId: OWNER, propertyType: 'immobilier_achat', status: 'active', title: 'Villa R+1 Bassam',
    });

    await bookingsService.create(CLIENT, {
      propertyId: 'prop-immo', startDate: '2026-01-01', endDate: '2026-01-02', guests: 1,
      paymentOption: 'zero_online', interestMessage: 'Bonjour, ce bien est-il toujours disponible ?',
    } as never);
    await flush();

    expect(messagingService.saveAutoBookingMessage).toHaveBeenCalledWith('bk-interest');
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'interest_booking_received', recipientId: OWNER }));
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'interest_submitted', recipientId: CLIENT }));
  });

  it('crée le message automatique même sans message d\'intérêt personnalisé', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({
      id: 'prop-immo', ownerId: OWNER, propertyType: 'immobilier_location', status: 'active', title: 'Appartement Marcory',
    });
    await bookingsService.create(CLIENT, {
      propertyId: 'prop-immo', startDate: '2026-01-01', endDate: '2026-01-02', guests: 1, paymentOption: 'zero_online',
    } as never);
    await flush();
    expect(messagingService.saveAutoBookingMessage).toHaveBeenCalledWith('bk-interest');
  });
});

describe('_notifyBookingCreatedConfirmed — destinataires', () => {
  it('notifie le professionnel (new_booking) et le client (booking_confirmed)', async () => {
    await bookingsService._notifyBookingCreatedConfirmed(
      'bk-1', { ownerId: OWNER, title: 'Villa' }, client, new Date('2026-02-01'), new Date('2026-02-03'),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'new_booking', recipientId: OWNER }));
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'booking_confirmed', recipientId: CLIENT }));
  });
});
