// Test d'intégration des 3 options de paiement — transitions d'état + notifications.
//   Option 1 — full_online        : webhook succès → réservation confirmée
//   Option 2 — ten_percent_online : webhook échec  → réservation annulée
//   Option 3 — zero_online        : confirmation immédiate (sans webhook)
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../config/env.config', () => ({ env: { FRONTEND_URL: 'http://app.test' } }));
jest.mock('./services/availability.service', () => ({ availabilityService: { checkRestaurantCapacity: jest.fn(async () => undefined), checkDatesAvailable: jest.fn(async () => undefined) } }));
jest.mock('./services/pricing.service', () => ({ pricingService: { compute: jest.fn() } }));
jest.mock('./services/cancellation.service', () => ({ cancellationService: { computeRefund: jest.fn() } }));
jest.mock('../payments/services/genius-pay.service', () => ({ geniusPayService: { initiatePayment: jest.fn(async () => ({ checkoutUrl: 'https://pay/x', reference: 'GP-REF' })) } }));
jest.mock('../wallets/wallets.service', () => ({ walletService: { getBalance: jest.fn(async () => 0), debit: jest.fn(), credit: jest.fn() } }));
jest.mock('../referrals/referrals.service', () => ({ referralsService: { triggerReward: jest.fn(async () => undefined) } }));
jest.mock('../messaging/messaging.service', () => ({ messagingService: { saveMessage: jest.fn(async () => ({ id: 'm' })), saveAutoBookingMessage: jest.fn(async () => ({ id: 'msg-auto' })) } }));
jest.mock('../notifications/notifications.service', () => ({ notificationsService: { notify: jest.fn(async () => undefined) } }));

// Webhook handler — externes mockés (Brevo/OneSignal/SMS/facture)
jest.mock('../../common/utils/mailer', () => ({ sendBookingConfirmationEmail: jest.fn(async () => undefined), sendTemplateEmail: jest.fn(async () => undefined) }));
jest.mock('../../common/utils/push', () => ({ sendPushNotification: jest.fn(async () => undefined) }));
jest.mock('../../common/utils/sms', () => ({ sendSms: jest.fn(async () => undefined) }));
jest.mock('../../config/brevo.config', () => ({ brevoConfig: { templates: { bookingConfirmation: 3, bookingCancellation: 4 } } }));
jest.mock('../boosts/boosts.service', () => ({ boostsService: { activatePaidBoost: jest.fn() } }));
jest.mock('../subscriptions/subscriptions.service', () => ({ subscriptionsService: { applyPaidPlanChange: jest.fn() } }));
jest.mock('../analytics/analytics.service', () => ({ analyticsService: { generateMarketReport: jest.fn() } }));
jest.mock('../../common/utils/invoice', () => ({ generateAndUploadBookingInvoice: jest.fn(async () => 'https://cdn/i.pdf') }));

const mockPrisma: Record<string, any> = {
  user: { findUnique: jest.fn(), update: jest.fn(async (a: any) => ({ id: 'c1', ...a.data })) },
  property: { findUnique: jest.fn() },
  booking: { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
  transaction: { create: jest.fn(async () => ({})), update: jest.fn(async () => ({})) },
  availability: { upsert: jest.fn(async () => ({})) },
  notification: { create: jest.fn(async () => ({})) },
};
// $transaction : forme callback (create()) ET forme tableau non utilisée ici
mockPrisma.$transaction = jest.fn(async (cb: any) => cb({
  booking: { create: jest.fn(async () => ({ id: 'bk-confirmed' })), update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ propertyId: 'p1' })) },
  transaction: { create: jest.fn(async () => ({})), update: jest.fn(async () => ({})) },
  property: { update: jest.fn(async () => ({})) },
}));
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { bookingsService } from './bookings.service';
import { processSuccessfulPayment, processFailedPayment } from '../webhooks/handlers/genius-pay.handler';
import { pricingService } from './services/pricing.service';
import { geniusPayService } from '../payments/services/genius-pay.service';
import { notificationsService } from '../notifications/notifications.service';
import { messagingService } from '../messaging/messaging.service';
import { sendBookingConfirmationEmail, sendTemplateEmail } from '../../common/utils/mailer';
import { sendPushNotification } from '../../common/utils/push';

const CLIENT = 'c1';
const OWNER = 'o1';
const client = { id: CLIENT, firstName: 'Koffi', lastName: 'Assi', phone: '+2250700000001', email: 'k@test.ci' };
const property = { id: 'p1', ownerId: OWNER, propertyType: 'residence', status: 'active', capacity: 8, title: 'Villa Cocody' };
const flush = () => new Promise((r) => setTimeout(r, 0));

const fullBookingForWebhook = {
  clientId: CLIENT, propertyId: 'p1', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-04'),
  client: { id: CLIENT, firstName: 'Koffi', lastName: 'Assi', email: 'k@test.ci', phone: '+2250700000001' },
  property: { title: 'Villa Cocody', ownerId: OWNER, owner: { id: OWNER, firstName: 'Amina', lastName: 'Coulibaly', email: 'a@test.ci', phone: '+2250700000002' } },
  totalAmount: 165000, invoiceUrl: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue(client);
  mockPrisma.property.findUnique.mockResolvedValue(property);
});

describe('Option 1 — 100 % en ligne → webhook succès → CONFIRMÉE', () => {
  it('création en attente de paiement + initiation Genius Pay', async () => {
    (pricingService.compute as jest.Mock).mockResolvedValue({ totalAmount: 165000, onlinePaidAmount: 165000, commissionAmount: 0, remainingCashAmount: 0, walletDeduction: 0, validatedPromoCodeId: null });
    const res = await bookingsService.create(CLIENT, { propertyId: 'p1', startDate: '2026-09-01', endDate: '2026-09-04', guests: 2, paymentOption: 'full_online' } as never);
    expect(geniusPayService.initiatePayment).toHaveBeenCalled();
    expect((res as any).payment.checkoutUrl).toBe('https://pay/x');
    // statut initial : pending_payment (aucune notification de confirmation encore)
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });

  it('webhook succès → booking confirmed + email & push aux deux parties + conversation', async () => {
    mockPrisma.booking.findUnique
      .mockResolvedValueOnce({ clientId: CLIENT, propertyId: 'p1', startDate: fullBookingForWebhook.startDate, endDate: fullBookingForWebhook.endDate }) // effets de bord
      .mockResolvedValue(fullBookingForWebhook); // notifyBookingConfirmed
    const tx = { id: 'tx-1', status: 'initiated', type: 'client_payment', bookingId: 'bk-1', amount: 165000, webhookReceived: false } as never;

    await processSuccessfulPayment(tx, 165000);
    await flush();

    // Transition d'état : la mise à jour vers "confirmed" se fait dans la $transaction
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    // Notifications confirmées
    expect(sendBookingConfirmationEmail).toHaveBeenCalledWith(expect.objectContaining({ bookingId: 'bk-1' }));
    expect(sendTemplateEmail).toHaveBeenCalled(); // email pro
    expect(sendPushNotification).toHaveBeenCalledWith(expect.objectContaining({ externalUserIds: [CLIENT] }));
    expect(sendPushNotification).toHaveBeenCalledWith(expect.objectContaining({ externalUserIds: [OWNER] }));
    // Conversation ouverte (message structuré post-paiement)
    expect(messagingService.saveAutoBookingMessage).toHaveBeenCalledWith('bk-1');
  });
});

describe('Option 2 — 10 % en ligne → webhook échec → ANNULÉE', () => {
  it('webhook échec → booking cancelled_by_client (system) + notif d\'annulation', async () => {
    mockPrisma.booking.findUnique
      .mockResolvedValueOnce({ status: 'pending_payment' }) // statut courant
      .mockResolvedValueOnce({ // notifyBookingCancelled
        clientId: CLIENT, client: { id: CLIENT, firstName: 'Koffi', email: 'k@test.ci' },
        property: { title: 'Villa Cocody', ownerId: OWNER, owner: { id: OWNER, firstName: 'Amina', email: 'a@test.ci' } },
        startDate: new Date('2026-09-01'),
      });
    const tx = { id: 'tx-2', status: 'initiated', type: 'client_payment', bookingId: 'bk-2', amount: 16500, webhookReceived: false } as never;

    await processFailedPayment(tx, { reference: 'GP-REF' });
    await flush();

    expect(mockPrisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'bk-2' },
      data: expect.objectContaining({ status: 'cancelled_by_client', cancelledBy: 'system' }),
    }));
    // Notification d'annulation au client (email + push)
    expect(sendTemplateEmail).toHaveBeenCalled();
    expect(sendPushNotification).toHaveBeenCalledWith(expect.objectContaining({ externalUserIds: [CLIENT] }));
  });
});

describe('Option 3 — 0 % en ligne → CONFIRMATION IMMÉDIATE (sans webhook)', () => {
  it('création directe confirmée + notify(new_booking, booking_confirmed) sans Genius Pay', async () => {
    (pricingService.compute as jest.Mock).mockResolvedValue({ totalAmount: 165000, onlinePaidAmount: 0, commissionAmount: 0, remainingCashAmount: 165000, walletDeduction: 0, validatedPromoCodeId: null });
    const res = await bookingsService.create(CLIENT, { propertyId: 'p1', startDate: '2026-09-01', endDate: '2026-09-04', guests: 2, paymentOption: 'zero_online' } as never);
    await flush();

    // Aucune initiation de paiement en ligne
    expect(geniusPayService.initiatePayment).not.toHaveBeenCalled();
    expect((res as any).payment).toBeUndefined();
    // Confirmation immédiate : notification au pro + au client
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'new_booking', recipientId: OWNER }));
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'booking_confirmed', recipientId: CLIENT }));
    // Conversation ouverte dès la création (message structuré)
    expect(messagingService.saveAutoBookingMessage).toHaveBeenCalledWith('bk-confirmed');
  });
});
