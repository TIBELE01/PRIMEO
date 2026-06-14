// Couverture étendue du handler Genius Pay : facture, paiement échoué,
// remboursement, et aiguillage des événements webhook.
jest.mock('../../../config/env.config', () => ({ env: { FRONTEND_URL: 'http://app.test' } }));
jest.mock('../../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../../common/utils/mailer', () => ({ sendBookingConfirmationEmail: jest.fn(async () => undefined), sendTemplateEmail: jest.fn(async () => undefined) }));
jest.mock('../../../common/utils/push', () => ({ sendPushNotification: jest.fn(async () => undefined) }));
jest.mock('../../../common/utils/sms', () => ({ sendSms: jest.fn(async () => undefined) }));
jest.mock('../../../config/brevo.config', () => ({ brevoConfig: { templates: { bookingConfirmation: 3, bookingCancellation: 4 } } }));
jest.mock('../../boosts/boosts.service', () => ({ boostsService: { activatePaidBoost: jest.fn() } }));
jest.mock('../../subscriptions/subscriptions.service', () => ({ subscriptionsService: { applyPaidPlanChange: jest.fn() } }));
jest.mock('../../referrals/referrals.service', () => ({ referralsService: { triggerReward: jest.fn(async () => undefined) } }));
jest.mock('../../analytics/analytics.service', () => ({ analyticsService: { generateMarketReport: jest.fn() } }));
jest.mock('../../../common/utils/invoice', () => ({ generateAndUploadBookingInvoice: jest.fn(async () => 'https://cdn/invoice.pdf') }));
jest.mock('../../messaging/messaging.service', () => ({ messagingService: { saveMessage: jest.fn() } }));

const mockPrisma: Record<string, any> = {
  booking: { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
  transaction: { findFirst: jest.fn(), update: jest.fn(async () => ({})) },
  notification: { create: jest.fn(async () => ({})) },
};
jest.mock('../../../database/prisma.service', () => ({ prisma: mockPrisma }));

import {
  ensureBookingInvoice, processFailedPayment,
  handlePaymentSuccess, handlePaymentFailed, handlePaymentRefunded,
} from './genius-pay.handler';
import { generateAndUploadBookingInvoice } from '../../../common/utils/invoice';
import { sendTemplateEmail } from '../../../common/utils/mailer';
import { sendPushNotification } from '../../../common/utils/push';

const flush = () => new Promise((r) => setTimeout(r, 0));
beforeEach(() => jest.clearAllMocks());

describe('ensureBookingInvoice', () => {
  const bk = {
    id: 'bk-12345678', startDate: new Date('2026-03-01'), endDate: new Date('2026-03-04'), guests: 2,
    totalAmount: 165000, onlinePaidAmount: 16500, remainingCashAmount: 148500,
    client: { firstName: 'Koffi', lastName: 'Assi', email: 'k@test.ci' },
    property: { title: 'Villa', propertyType: 'residence' },
    invoiceUrl: null,
  };
  it('génère et stocke la facture si absente', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(bk);
    const url = await ensureBookingInvoice('bk-1');
    expect(generateAndUploadBookingInvoice).toHaveBeenCalled();
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({ data: { invoiceUrl: 'https://cdn/invoice.pdf' } }));
    expect(url).toBe('https://cdn/invoice.pdf');
  });
  it('court-circuite si la facture existe déjà', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ ...bk, invoiceUrl: 'https://cdn/existing.pdf' });
    const url = await ensureBookingInvoice('bk-1');
    expect(url).toBe('https://cdn/existing.pdf');
    expect(generateAndUploadBookingInvoice).not.toHaveBeenCalled();
  });
  it('restaurant : description « réservation de table »', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ ...bk, property: { title: 'Resto', propertyType: 'restaurant' } });
    await ensureBookingInvoice('bk-1');
    expect(generateAndUploadBookingInvoice).toHaveBeenCalledWith(expect.objectContaining({
      lineDescription: expect.stringContaining('couvert'), sectionLabel: 'Réservation',
    }));
  });
  it('renvoie null si réservation introuvable', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null);
    expect(await ensureBookingInvoice('bk-x')).toBeNull();
  });
});

describe('processFailedPayment', () => {
  it('annule la réservation pending + notifie le client (email + push)', async () => {
    const tx = { id: 'tx-1', status: 'initiated', bookingId: 'bk-1', webhookReceived: false } as never;
    mockPrisma.booking.findUnique
      .mockResolvedValueOnce({ status: 'pending_payment' }) // statut courant
      .mockResolvedValueOnce({ // notifyBookingCancelled include
        clientId: 'c1', client: { id: 'c1', firstName: 'Koffi', email: 'k@test.ci' },
        property: { title: 'Villa', ownerId: 'o1', owner: { id: 'o1', firstName: 'A', email: 'a@test.ci' } },
        startDate: new Date('2026-03-01'),
      });
    await processFailedPayment(tx, { reference: 'r' });
    await flush();
    expect(mockPrisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'cancelled_by_client', cancelledBy: 'system' }),
    }));
    expect(sendTemplateEmail).toHaveBeenCalled();
    expect(sendPushNotification).toHaveBeenCalledWith(expect.objectContaining({ externalUserIds: ['c1'] }));
  });
  it('idempotent : transaction déjà failed → no-op', async () => {
    await processFailedPayment({ id: 'tx-1', status: 'failed', bookingId: 'bk-1' } as never);
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });
  it('ne touche pas une réservation déjà confirmée', async () => {
    mockPrisma.booking.findUnique.mockResolvedValueOnce({ status: 'confirmed' });
    await processFailedPayment({ id: 'tx-1', status: 'initiated', bookingId: 'bk-1', webhookReceived: false } as never);
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });
});

describe('aiguillage webhook', () => {
  it('handlePaymentSuccess : référence absente → warn, pas d\'exception', async () => {
    await expect(handlePaymentSuccess({})).resolves.toBeUndefined();
  });
  it('handlePaymentSuccess : aucune transaction → no-op', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);
    await handlePaymentSuccess({ reference: 'r' });
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });
  it('handlePaymentFailed : aucune transaction → no-op', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);
    await handlePaymentFailed({ reference: 'r' });
  });
  it('handlePaymentRefunded : marque la transaction refunded', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1' });
    await handlePaymentRefunded({ reference: 'r' });
    expect(mockPrisma.transaction.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'refunded' }),
    }));
  });
  it('handlePaymentRefunded : référence absente → warn', async () => {
    await expect(handlePaymentRefunded({})).resolves.toBeUndefined();
  });
});
