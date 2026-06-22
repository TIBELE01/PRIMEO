// Couverture étendue bookingsService : lecture, transitions de statut, sync
// paiement, facture, et branches de validation/paiement en ligne de create().
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../config/env.config', () => ({ env: { FRONTEND_URL: 'http://app.test' } }));
jest.mock('./services/availability.service', () => ({ availabilityService: { checkRestaurantCapacity: jest.fn(async () => undefined), checkDatesAvailable: jest.fn(async () => undefined) } }));
jest.mock('./services/pricing.service', () => ({ pricingService: { compute: jest.fn() } }));
jest.mock('./services/cancellation.service', () => ({ cancellationService: { computeRefund: jest.fn(() => ({ refundAmount: 0 })) } }));
jest.mock('../payments/services/genius-pay.service', () => ({ geniusPayService: { initiatePayment: jest.fn(), getPaymentStatus: jest.fn() } }));
jest.mock('../webhooks/handlers/genius-pay.handler', () => ({
  processSuccessfulPayment: jest.fn(async () => undefined), processFailedPayment: jest.fn(async () => undefined), ensureBookingInvoice: jest.fn(async () => 'https://cdn/i.pdf'), emailBookingInvoice: jest.fn(async () => undefined),
}));
jest.mock('../notifications/notifications.service', () => ({ notificationsService: { notify: jest.fn(async () => undefined) } }));
jest.mock('../messaging/messaging.service', () => ({ messagingService: { saveMessage: jest.fn(), saveAutoBookingMessage: jest.fn(async () => ({ id: 'msg-auto' })) } }));
jest.mock('../referrals/referrals.service', () => ({ referralsService: { triggerReward: jest.fn(async () => undefined) } }));
jest.mock('../wallets/wallets.service', () => ({ walletService: { getBalance: jest.fn(async () => 0), debit: jest.fn(), credit: jest.fn() } }));
jest.mock('../../common/handlers/http-error.handler', () => ({
  HttpError: class HttpError extends Error { statusCode: number; constructor(s: number, m: string) { super(m); this.statusCode = s; } },
}));

const mockPrisma: Record<string, any> = {
  user: { findUnique: jest.fn(), update: jest.fn(async (a: any) => ({ id: 'c1', ...a.data })) },
  property: { findUnique: jest.fn() },
  booking: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn(async () => ({})) },
  transaction: { findFirst: jest.fn(), create: jest.fn(async () => ({})) },
};
mockPrisma.$transaction = jest.fn(async (cb: any) => cb({
  booking: { create: jest.fn(async () => ({ id: 'bk-new' })), update: jest.fn(async () => ({})) },
  transaction: { create: jest.fn(async () => ({})) },
}));
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { bookingsService } from './bookings.service';
import { processSuccessfulPayment, processFailedPayment } from '../webhooks/handlers/genius-pay.handler';
import { geniusPayService } from '../payments/services/genius-pay.service';
import { pricingService } from './services/pricing.service';

beforeEach(() => jest.clearAllMocks());

describe('getById — accès & masquage adresse', () => {
  // Fabrique de réservation : un nouvel objet property à chaque appel (getById
  // mute property.street en place — éviter tout partage d'état entre tests).
  const fresh = (status = 'pending_payment') => ({
    id: 'bk-1', clientId: 'c1', status,
    property: { ownerId: 'o1', street: '12 rue X' },
  });
  it('autorise le client et masque la rue tant que non confirmé', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fresh());
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'client' });
    const b = await bookingsService.getById('bk-1', 'c1');
    expect((b.property as any).street).toBeNull();
  });
  it('révèle la rue si confirmé', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fresh('confirmed'));
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'client' });
    const b = await bookingsService.getById('bk-1', 'c1');
    expect((b.property as any).street).toBe('12 rue X');
  });
  it('refuse un tiers (403)', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fresh());
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'client' });
    await expect(bookingsService.getById('bk-1', 'intrus')).rejects.toMatchObject({ statusCode: 403 });
  });
  it('404 si introuvable', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null);
    await expect(bookingsService.getById('bk-x', 'c1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('listForUser', () => {
  it('filtre par propriétaire pour un professionnel', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'professional_hotel' });
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.booking.count.mockResolvedValue(0);
    await bookingsService.listForUser('o1', { status: undefined, page: 1, limit: 10 } as never);
    const where = mockPrisma.booking.findMany.mock.calls[0][0].where;
    expect(where).toHaveProperty('property', { ownerId: 'o1' });
  });
  it('filtre par clientId pour un client', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'client' });
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.booking.count.mockResolvedValue(0);
    await bookingsService.listForUser('c1', { status: 'confirmed', page: 1, limit: 10 } as never);
    const where = mockPrisma.booking.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ clientId: 'c1', status: 'confirmed' });
  });
});

describe('confirm / complete / markCashReceived', () => {
  it('confirm : refuse si pas en attente de paiement', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ status: 'confirmed', property: { ownerId: 'o1' } });
    await expect(bookingsService.confirm('bk-1', 'o1')).rejects.toMatchObject({ statusCode: 400 });
  });
  it('confirm : refuse un non-propriétaire', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ status: 'pending_payment', property: { ownerId: 'o1' } });
    await expect(bookingsService.confirm('bk-1', 'autre')).rejects.toMatchObject({ statusCode: 403 });
  });
  it('confirm : succès → statut confirmed', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ clientId: 'c1', status: 'pending_payment', property: { ownerId: 'o1' } });
    mockPrisma.booking.update.mockResolvedValue({ id: 'bk-1', status: 'confirmed' });
    const r = await bookingsService.confirm('bk-1', 'o1');
    expect(r).toMatchObject({ status: 'confirmed' });
  });
  it('complete : refuse si pas confirmé', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ status: 'pending_payment', property: { ownerId: 'o1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'professional_hotel' });
    await expect(bookingsService.complete('bk-1', 'o1')).rejects.toMatchObject({ statusCode: 400 });
  });
  it('complete : succès', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ clientId: 'c1', status: 'confirmed', property: { ownerId: 'o1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'admin' });
    await expect(bookingsService.complete('bk-1', 'admin')).resolves.toMatchObject({ message: expect.any(String) });
  });
  it('markCashReceived : refuse si aucun cash attendu', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ clientId: 'c1', status: 'confirmed', remainingCashAmount: 0, property: { ownerId: 'o1' } });
    await expect(bookingsService.markCashReceived('bk-1', 'o1')).rejects.toMatchObject({ statusCode: 400 });
  });
  it('markCashReceived : succès enregistre la transaction et termine', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ clientId: 'c1', status: 'confirmed', remainingCashAmount: 50000, property: { ownerId: 'o1' } });
    const r = await bookingsService.markCashReceived('bk-1', 'o1');
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(r.message).toContain('cash');
  });
});

describe('syncPaymentStatus', () => {
  it('renvoie directement un statut terminal', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ clientId: 'c1', status: 'confirmed', invoiceUrl: 'u', property: { ownerId: 'o1' } });
    const r = await bookingsService.syncPaymentStatus('bk-1', 'c1');
    expect(r).toMatchObject({ bookingStatus: 'confirmed', paymentStatus: 'success' });
  });
  it('paiement GP réussi → applique processSuccessfulPayment', async () => {
    mockPrisma.booking.findUnique
      .mockResolvedValueOnce({ clientId: 'c1', status: 'pending_payment', property: { ownerId: 'o1' } })
      .mockResolvedValueOnce({ status: 'confirmed', invoiceUrl: 'u' });
    mockPrisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1', amount: 16500, geniusPayTransactionId: 'GP-1' });
    (geniusPayService.getPaymentStatus as jest.Mock).mockResolvedValue({ status: 'success', amount: 16500 });
    const r = await bookingsService.syncPaymentStatus('bk-1', 'c1');
    expect(processSuccessfulPayment).toHaveBeenCalled();
    expect(r.paymentStatus).toBe('success');
  });
  it('paiement GP échoué → applique processFailedPayment', async () => {
    mockPrisma.booking.findUnique
      .mockResolvedValueOnce({ clientId: 'c1', status: 'pending_payment', property: { ownerId: 'o1' } })
      .mockResolvedValueOnce({ status: 'cancelled_by_client' });
    mockPrisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1', amount: 16500, geniusPayTransactionId: 'GP-1' });
    (geniusPayService.getPaymentStatus as jest.Mock).mockResolvedValue({ status: 'failed', amount: 0 });
    const r = await bookingsService.syncPaymentStatus('bk-1', 'c1');
    expect(processFailedPayment).toHaveBeenCalled();
    expect(r.paymentStatus).toBe('failed');
  });
});

describe('getInvoice', () => {
  it('refuse tant que non confirmé', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ clientId: 'c1', status: 'pending_payment', property: { ownerId: 'o1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'client' });
    await expect(bookingsService.getInvoice('bk-1', 'c1')).rejects.toMatchObject({ statusCode: 400 });
  });
  it('renvoie l\'URL de facture si confirmé', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ clientId: 'c1', status: 'confirmed', invoiceUrl: 'https://cdn/i.pdf', property: { ownerId: 'o1' } });
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'client' });
    const r = await bookingsService.getInvoice('bk-1', 'c1');
    expect(r).toEqual({ invoiceUrl: 'https://cdn/i.pdf' });
  });
});

describe('create — validations & paiement en ligne', () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'c1', firstName: 'K', lastName: 'A', phone: '+2250700000000', email: 'k@test.ci' });
  });
  it('refuse une propriété inactive', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ id: 'p1', propertyType: 'residence', status: 'draft' });
    await expect(bookingsService.create('c1', { propertyId: 'p1', startDate: '2026-08-01', endDate: '2026-08-03', guests: 2, paymentOption: 'full_online' } as never))
      .rejects.toMatchObject({ statusCode: 400 });
  });
  it('refuse un dépassement de capacité', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ id: 'p1', propertyType: 'residence', status: 'active', capacity: 2 });
    await expect(bookingsService.create('c1', { propertyId: 'p1', startDate: '2026-08-01', endDate: '2026-08-03', guests: 5, paymentOption: 'full_online' } as never))
      .rejects.toMatchObject({ statusCode: 400 });
  });
  it('paiement en ligne : crée la réservation puis initie Genius Pay', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ id: 'p1', propertyType: 'residence', status: 'active', capacity: 8 });
    (pricingService.compute as jest.Mock).mockResolvedValue({ totalAmount: 165000, onlinePaidAmount: 16500, commissionAmount: 0, remainingCashAmount: 148500, walletDeduction: 0, validatedPromoCodeId: null });
    (geniusPayService.initiatePayment as jest.Mock).mockResolvedValue({ checkoutUrl: 'https://pay/x', reference: 'GP-1' });
    const res = await bookingsService.create('c1', { propertyId: 'p1', startDate: '2026-08-01', endDate: '2026-08-03', guests: 2, paymentOption: 'ten_percent_online' } as never);
    expect(geniusPayService.initiatePayment).toHaveBeenCalled();
    expect((res as any).payment).toMatchObject({ checkoutUrl: 'https://pay/x' });
  });
});
