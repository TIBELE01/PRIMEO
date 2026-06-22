// Test du flux paiement en ligne (Genius Pay) : après confirmation du paiement
// (réservation résidence/hôtel en full_online ou ten_percent_online), la
// conversation doit s'ouvrir automatiquement (message auto) et les deux parties
// recevoir email (Brevo) + push (OneSignal).
jest.mock('../../../config/env.config', () => ({ env: { FRONTEND_URL: 'http://app.test' } }));
jest.mock('../../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../common/utils/mailer', () => ({
  sendBookingConfirmationEmail: jest.fn(async () => undefined),
  sendTemplateEmail: jest.fn(async () => undefined),
  sendBookingInvoiceEmail: jest.fn(async () => undefined),
}));
jest.mock('../../../common/utils/push', () => ({ sendPushNotification: jest.fn(async () => undefined) }));
jest.mock('../../../common/utils/sms', () => ({ sendSms: jest.fn(async () => undefined) }));
jest.mock('../../../config/brevo.config', () => ({ brevoConfig: { templates: { bookingConfirmation: 3, bookingCancellation: 4 } } }));
jest.mock('../../boosts/boosts.service', () => ({ boostsService: { activatePaidBoost: jest.fn() } }));
jest.mock('../../subscriptions/subscriptions.service', () => ({ subscriptionsService: { applyPaidPlanChange: jest.fn() } }));
jest.mock('../../referrals/referrals.service', () => ({ referralsService: { triggerReward: jest.fn(async () => undefined) } }));
jest.mock('../../analytics/analytics.service', () => ({ analyticsService: { generateMarketReport: jest.fn() } }));
jest.mock('../../../common/utils/invoice', () => ({ generateAndUploadBookingInvoice: jest.fn(async () => 'https://cdn/invoice.pdf'), formatBookingInvoiceRef: jest.fn(() => 'FAC-2026-06-TEST') }));
jest.mock('../../messaging/messaging.service', () => ({
  messagingService: {
    saveMessage: jest.fn(async () => ({ id: 'msg-1' })),
    saveAutoBookingMessage: jest.fn(async () => ({ id: 'msg-auto' })),
  },
}));

const CLIENT = 'client-1';
const OWNER = 'owner-1';
const fullBooking = {
  clientId: CLIENT,
  startDate: new Date('2026-03-01'),
  endDate: new Date('2026-03-04'),
  property: {
    title: 'Villa Cocody', ownerId: OWNER,
    owner: { id: OWNER, firstName: 'Amina', lastName: 'Coulibaly', email: 'amina@test.ci', phone: '+2250700000002' },
  },
  client: { id: CLIENT, firstName: 'Koffi', lastName: 'Assi', email: 'koffi@test.ci', phone: '+2250700000001' },
  totalAmount: 165000,
  invoiceUrl: null,
};

const mockPrisma: Record<string, any> = {
  transaction: { update: jest.fn(async () => ({})) },
  booking: {
    update: jest.fn(async () => ({})),
    // 1er appel (dans $transaction) : { propertyId } ; 2e : booking pour effets de bord ;
    // 3e : invoice ; 4e : notifyBookingConfirmed (include complet)
    findUnique: jest.fn(),
  },
  property: { update: jest.fn(async () => ({})) },
  availability: { upsert: jest.fn(async () => ({})) },
  notification: { create: jest.fn(async () => ({})) },
};
mockPrisma.$transaction = jest.fn(async (cb: any) =>
  cb({
    transaction: { update: jest.fn(async () => ({})) },
    booking: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ propertyId: 'prop-1' })) },
    property: { update: jest.fn(async () => ({})) },
  }),
);
jest.mock('../../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { processSuccessfulPayment } from './genius-pay.handler';
import { messagingService } from '../../messaging/messaging.service';
import { sendBookingConfirmationEmail, sendTemplateEmail } from '../../../common/utils/mailer';
import { sendPushNotification } from '../../../common/utils/push';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('processSuccessfulPayment — réservation payée en ligne', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // findUnique séquence : effets de bord (clientId/propertyId/dates) → invoice → notify
    mockPrisma.booking.findUnique
      .mockResolvedValueOnce({ clientId: CLIENT, propertyId: 'prop-1', startDate: fullBooking.startDate, endDate: fullBooking.endDate })
      .mockResolvedValue(fullBooking);
  });

  it('ouvre la conversation (message auto) et envoie email + push aux deux parties', async () => {
    const tx = { id: 'tx-1', status: 'initiated', type: 'client_payment', bookingId: 'bk-1', amount: 16500, webhookReceived: false } as never;

    await processSuccessfulPayment(tx, 16500);
    await flush();

    // Conversation ouverte automatiquement après paiement (message structuré)
    expect(messagingService.saveAutoBookingMessage).toHaveBeenCalledWith('bk-1');

    // Emails Brevo : client (confirmation) + professionnel (alerte)
    expect(sendBookingConfirmationEmail).toHaveBeenCalledWith(expect.objectContaining({ bookingId: 'bk-1' }));
    expect(sendTemplateEmail).toHaveBeenCalled();

    // Push OneSignal : au client ET au professionnel (2 appels)
    expect(sendPushNotification).toHaveBeenCalledWith(expect.objectContaining({ externalUserIds: [CLIENT] }));
    expect(sendPushNotification).toHaveBeenCalledWith(expect.objectContaining({ externalUserIds: [OWNER] }));
  });

  it('est idempotent : ne retraite pas une transaction déjà réussie', async () => {
    const tx = { id: 'tx-1', status: 'success', type: 'client_payment', bookingId: 'bk-1', amount: 16500, webhookReceived: true } as never;
    await processSuccessfulPayment(tx, 16500);
    await flush();
    expect(messagingService.saveAutoBookingMessage).not.toHaveBeenCalled();
    expect(sendPushNotification).not.toHaveBeenCalled();
  });
});
