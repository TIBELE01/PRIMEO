// Expiration des réservations impayées : jamais pour « 100 % sur place » (zero_online),
// toujours pour les vrais impayés en ligne (100 % et 10 %).
jest.mock('../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../modules/payments/services/genius-pay.service', () => ({ geniusPayService: { getPaymentStatus: jest.fn() } }));
jest.mock('../modules/webhooks/handlers/genius-pay.handler', () => ({ processSuccessfulPayment: jest.fn(), processFailedPayment: jest.fn() }));
jest.mock('../modules/notifications/notifications.service', () => ({ notificationsService: { notify: jest.fn(async () => undefined) } }));
jest.mock('../modules/bookings/services/booking-credits.service', () => ({ bookingCreditsService: { release: jest.fn() } }));

type B = { id: string; status: string; paymentOption: string; createdAt: Date; clientId: string; client: object; property: { title: string }; transactions: object[] };
let db: B[] = [];
const mockPrisma: Record<string, any> = {
  booking: {
    // Simule le filtre Prisma : statut + paymentOption « not » + date
    findMany: jest.fn(async ({ where }: any) =>
      db.filter((b) => b.status === where.status
        && (!where.paymentOption?.not || b.paymentOption !== where.paymentOption.not)
        && b.createdAt < where.createdAt.lt)),
    findUnique: jest.fn(async ({ where }: any) => db.find((b) => b.id === where.id) ?? null),
    update: jest.fn(async ({ where, data }: any) => { Object.assign(db.find((b) => b.id === where.id)!, data); }),
  },
  transaction: { updateMany: jest.fn(), findUnique: jest.fn() },
  auditLog: { create: jest.fn(async () => ({})) },
  $transaction: jest.fn(async (fn: any) => fn(mockPrisma)),
};
jest.mock('../database/prisma.service', () => ({ prisma: mockPrisma }));

import { expireUnpaidBookings } from './pending-payment-expiry.job';
import { geniusPayService } from '../modules/payments/services/genius-pay.service';
import { processSuccessfulPayment } from '../modules/webhooks/handlers/genius-pay.handler';

const old = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 h : délai de grâce (2 h) dépassé
const mk = (id: string, status: string, paymentOption: string, createdAt = old, transactions: object[] = []): B =>
  ({ id, status, paymentOption, createdAt, clientId: 'c1', client: { id: 'c1', firstName: 'A', lastName: 'B' }, property: { title: 'Studio' }, transactions });

beforeEach(() => jest.clearAllMocks());

describe('expiration des réservations impayées', () => {
  it('ne touche jamais une réservation 100 % sur place, même ancienne ou restée en attente', async () => {
    db = [mk('cash-ok', 'confirmed', 'zero_online'), mk('cash-anormale', 'pending_payment', 'zero_online')];
    await expireUnpaidBookings();
    expect(db.map((b) => b.status)).toEqual(['confirmed', 'pending_payment']);
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it('annule les impayés en ligne (100 % et 10 %) après le délai de grâce', async () => {
    db = [mk('full', 'pending_payment', 'full_online'), mk('ten', 'pending_payment', 'ten_percent_online')];
    await expireUnpaidBookings();
    expect(db.map((b) => b.status)).toEqual(['cancelled_by_client', 'cancelled_by_client']);
    expect(db[0]).toMatchObject({ cancelledBy: 'system', cancellationReason: expect.stringMatching(/Paiement non reçu/) });
  });

  it('laisse le délai de grâce courir (réservation en ligne de moins de 2 h)', async () => {
    db = [mk('recent', 'pending_payment', 'ten_percent_online', new Date())];
    await expireUnpaidBookings();
    expect(db[0]!.status).toBe('pending_payment');
  });

  it('confirme au lieu d’annuler si Genius Pay indique le paiement reçu', async () => {
    db = [mk('paid', 'pending_payment', 'ten_percent_online', old, [{ id: 't1', status: 'initiated', geniusPayTransactionId: 'MTX-1', amount: 7000 }])];
    (geniusPayService.getPaymentStatus as jest.Mock).mockResolvedValue({ status: 'success', amount: 7000 });
    mockPrisma.transaction.findUnique.mockResolvedValue({ id: 't1', amount: 7000 });
    await expireUnpaidBookings();
    expect(processSuccessfulPayment).toHaveBeenCalled();
    expect(db[0]!.status).toBe('pending_payment'); // pas d'annulation forcée
  });
});
