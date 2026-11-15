// Tests unitaires — processSuccessfulPayment : traitement unique d'un paiement et
// refus de confirmer deux réservations sur les mêmes dates.

jest.mock('../../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../../common/utils/mailer', () => ({
  sendBookingConfirmationEmail: jest.fn(async () => undefined),
  sendTemplateEmail: jest.fn(async () => undefined),
  sendBookingInvoiceEmail: jest.fn(async () => undefined),
}));
jest.mock('../../../common/utils/push', () => ({ sendPushNotification: jest.fn(async () => undefined) }));
jest.mock('../../../common/utils/sms', () => ({ sendSms: jest.fn(async () => undefined) }));
jest.mock('../../../config/brevo.config', () => ({ brevoConfig: { templates: { bookingConfirmation: 3, bookingCancellation: 4, bookingConfirmationPro: 5 } } }));
jest.mock('../../../config/env.config', () => ({ env: { FRONTEND_URL: 'http://app.test' } }));
jest.mock('../../boosts/boosts.service', () => ({ boostsService: { activatePaidBoost: jest.fn(async () => undefined) } }));
jest.mock('../../subscriptions/subscriptions.service', () => ({ subscriptionsService: { applyPaidPlanChange: jest.fn(), activatePurchasedSlots: jest.fn() } }));
jest.mock('../../referrals/referrals.service', () => ({ referralsService: { triggerReward: jest.fn(async () => undefined) } }));
jest.mock('../../analytics/analytics.service', () => ({ analyticsService: { generateMarketReport: jest.fn() } }));
jest.mock('../../../common/utils/invoice', () => ({ generateAndUploadBookingInvoice: jest.fn(async () => 'https://cdn/i.pdf'), formatBookingInvoiceRef: jest.fn(() => 'FAC-TEST') }));
jest.mock('../../messaging/messaging.service', () => ({ messagingService: { saveAutoBookingMessage: jest.fn(async () => ({})) } }));

const mockReleaseCredits = jest.fn(async () => ({ walletRefunded: 0, promoReleased: false }));
jest.mock('../../bookings/services/booking-credits.service', () => ({
  bookingCreditsService: { release: (...a: unknown[]) => mockReleaseCredits(...(a as [])) },
}));
const mockWalletCredit = jest.fn(async () => 0);
jest.mock('../../wallets/wallets.service', () => ({
  walletService: { credit: (...a: unknown[]) => mockWalletCredit(...(a as [])) },
}));
const mockFindOverlapping = jest.fn();
const mockLock = jest.fn(async () => undefined);
jest.mock('../../../database/repositories/booking.repository', () => ({
  bookingRepository: {
    findOverlapping: (...a: unknown[]) => mockFindOverlapping(...a),
    lockPropertyCalendar: (...a: unknown[]) => mockLock(...(a as [])),
  },
}));

// Client transactionnel simulé
let bookingStatus = 'pending_payment';
let propertyType = 'residence';
let claimCount = 1;
const txClient = {
  transaction: {
    updateMany: jest.fn(async () => ({ count: claimCount })),
    create: jest.fn(async () => ({})),
  },
  booking: {
    findUnique: jest.fn(async ({ select }: { select: Record<string, unknown> }) =>
      'status' in select
        ? { status: bookingStatus }
        : {
            clientId: 'c1', propertyId: 'p1',
            startDate: new Date('2026-09-01'), endDate: new Date('2026-09-04'),
            property: { propertyType },
          }),
    update: jest.fn(async () => ({})),
  },
  property: { update: jest.fn(async () => ({})) },
};
const mockPrisma: Record<string, any> = {
  booking: { findUnique: jest.fn(async () => null), update: jest.fn(async () => ({})) },
  notification: { create: jest.fn(async () => ({})) },
  availability: { upsert: jest.fn(async () => ({})) },
  $transaction: jest.fn(async (cb: any) => cb(txClient)),
};
jest.mock('../../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { processSuccessfulPayment } from './genius-pay.handler';
import { boostsService } from '../../boosts/boosts.service';

const paymentTx = (over: Record<string, unknown> = {}) =>
  ({ id: 'tx-1', status: 'initiated', type: 'client_payment', bookingId: 'bk-1', amount: 50000, webhookReceived: false, ...over }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  bookingStatus = 'pending_payment';
  propertyType = 'residence';
  claimCount = 1;
  mockFindOverlapping.mockResolvedValue([]);
});

describe('processSuccessfulPayment — traitement unique', () => {
  it('prend la transaction par une mise à jour conditionnelle (statut ≠ success)', async () => {
    await processSuccessfulPayment(paymentTx(), 50000);
    expect(txClient.transaction.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'tx-1', status: { not: 'success' } },
      data: expect.objectContaining({ status: 'success' }),
    }));
  });

  it('ne fait rien si un appel concurrent a déjà traité le paiement', async () => {
    claimCount = 0; // la prise atomique échoue : quelqu'un d'autre est passé avant
    await processSuccessfulPayment(paymentTx(), 50000);
    expect(txClient.booking.update).not.toHaveBeenCalled();
    expect(txClient.property.update).not.toHaveBeenCalled();
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it('n\'active pas deux fois un boost payé', async () => {
    claimCount = 0;
    await processSuccessfulPayment(paymentTx({ type: 'boost_purchase', bookingId: null }), 2000);
    expect(boostsService.activatePaidBoost).not.toHaveBeenCalled();
  });
});

describe('processSuccessfulPayment — double réservation', () => {
  it('confirme sous verrou quand les dates sont libres', async () => {
    await processSuccessfulPayment(paymentTx(), 50000);

    expect(mockLock).toHaveBeenCalledWith('p1', txClient);
    expect(mockFindOverlapping).toHaveBeenCalledWith('p1', new Date('2026-09-01'), new Date('2026-09-04'), 'bk-1', txClient);
    expect(txClient.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'confirmed', onlinePaidAmount: 50000 }),
    }));
    expect(txClient.property.update).toHaveBeenCalled();
    expect(mockWalletCredit).not.toHaveBeenCalled();
  });

  it('dates déjà prises → réservation annulée, paiement recrédité, crédits restitués, pas de confirmation', async () => {
    mockFindOverlapping.mockResolvedValue([{ id: 'bk-autre' }]);

    await processSuccessfulPayment(paymentTx(), 50000);

    expect(txClient.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'cancelled_by_client', cancelledBy: 'system' }),
    }));
    expect(txClient.booking.update).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'confirmed' }),
    }));
    expect(mockWalletCredit).toHaveBeenCalledWith('c1', 50000, txClient);
    expect(txClient.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'refund', amount: 50000, status: 'success' }),
    }));
    expect(mockReleaseCredits).toHaveBeenCalledWith('bk-1', txClient);
    expect(txClient.property.update).not.toHaveBeenCalled(); // bookingsCount inchangé
  });

  it('paiement arrivé après l\'annulation de la réservation → recrédité, réservation non ressuscitée', async () => {
    bookingStatus = 'cancelled_by_client';

    await processSuccessfulPayment(paymentTx(), 50000);

    expect(txClient.booking.update).not.toHaveBeenCalled();
    expect(mockWalletCredit).toHaveBeenCalledWith('c1', 50000, txClient);
    // Les crédits ont déjà été rendus à l'annulation : pas de seconde restitution
    expect(mockReleaseCredits).not.toHaveBeenCalled();
  });

  it('réservation déjà confirmée à la main par le professionnel → enregistre le montant payé, sans doublon', async () => {
    bookingStatus = 'confirmed';

    await processSuccessfulPayment(paymentTx(), 50000);

    expect(txClient.booking.update).toHaveBeenCalledWith({ where: { id: 'bk-1' }, data: { onlinePaidAmount: 50000 } });
    expect(txClient.property.update).not.toHaveBeenCalled();
    expect(mockWalletCredit).not.toHaveBeenCalled();
  });

  it('restaurant : pas de contrôle de chevauchement de dates', async () => {
    propertyType = 'restaurant';
    await processSuccessfulPayment(paymentTx(), 5000);
    expect(mockFindOverlapping).not.toHaveBeenCalled();
    expect(txClient.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'confirmed' }),
    }));
  });
});
