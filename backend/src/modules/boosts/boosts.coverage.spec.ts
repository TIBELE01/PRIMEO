// Couverture étendue boostsService : solde, historique, activation post-paiement,
// expiration automatique.
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../config/env.config', () => ({ env: { FRONTEND_URL: 'http://app.test', BACKEND_URL: 'http://api.test' } }));
jest.mock('../payments/services/genius-pay.service', () => ({ geniusPayService: { initiatePayment: jest.fn() } }));
jest.mock('../notifications/notifications.service', () => ({ notificationsService: { notify: jest.fn(async () => undefined) } }));
jest.mock('../../common/handlers/http-error.handler', () => ({
  HttpError: class HttpError extends Error { statusCode: number; constructor(s: number, m: string) { super(m); this.statusCode = s; } },
}));

const mockPrisma: Record<string, any> = {
  boost: { findMany: jest.fn(), create: jest.fn(async () => ({ id: 'b1' })) },
  subscription: { findUnique: jest.fn() },
  property: { findUnique: jest.fn(), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({ count: 0 })) },
  transaction: { findUnique: jest.fn() },
};
mockPrisma.$transaction = jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops));
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { boostsService } from './boosts.service';
import { notificationsService } from '../notifications/notifications.service';

const flush = () => new Promise((r) => setTimeout(r, 0));
beforeEach(() => jest.clearAllMocks());

describe('getBalance', () => {
  it('renvoie le quota restant selon la formule', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business', boostsFreeMonthly: 2, boostsFreeUsedThisMonth: 1 });
    const b = await boostsService.getBalance('u1');
    expect(b).toMatchObject({ freeBoostsRemaining: 1, freeBoostsTotal: 2, plan: 'business' });
  });
  it('renvoie zéro sans abonnement', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    expect(await boostsService.getBalance('u1')).toMatchObject({ freeBoostsRemaining: 0, plan: null });
  });
});

describe('listForOwner', () => {
  it('normalise expiresAt / isActive / property.name', async () => {
    const future = new Date(Date.now() + 86_400_000);
    mockPrisma.boost.findMany.mockResolvedValue([{ id: 'b1', endDate: future, property: { title: 'Villa' } }]);
    const res = await boostsService.listForOwner('u1');
    expect(res[0]).toMatchObject({ isActive: true, property: { name: 'Villa' } });
    expect(res[0].expiresAt).toBe(future);
  });
});

describe('activatePaidBoost', () => {
  it('crée le boost et marque l\'annonce boostée après paiement', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', type: 'boost_purchase', notes: 'prop-1', userId: 'u1', amount: 2000 });
    mockPrisma.property.findUnique
      .mockResolvedValueOnce({ isBoosted: false })          // garde anti-doublon
      .mockResolvedValueOnce({ title: 'Villa', ownerId: 'u1' }); // pour la notif
    await boostsService.activatePaidBoost('tx-1');
    await flush();
    expect(mockPrisma.boost.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'paid', propertyId: 'prop-1' }) }));
    expect(mockPrisma.property.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isBoosted: true }) }));
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'boost_activated', recipientId: 'u1' }));
  });
  it('no-op si transaction non boost_purchase', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', type: 'client_payment' });
    await boostsService.activatePaidBoost('tx-1');
    expect(mockPrisma.boost.create).not.toHaveBeenCalled();
  });
  it('no-op si annonce déjà boostée (anti-doublon)', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', type: 'boost_purchase', notes: 'prop-1', userId: 'u1', amount: 2000 });
    mockPrisma.property.findUnique.mockResolvedValueOnce({ isBoosted: true });
    await boostsService.activatePaidBoost('tx-1');
    expect(mockPrisma.boost.create).not.toHaveBeenCalled();
  });
});

describe('expireBoosts', () => {
  it('désactive les boosts arrivés à échéance', async () => {
    mockPrisma.boost.findMany.mockResolvedValue([{ propertyId: 'p1' }, { propertyId: 'p2' }, { propertyId: 'p1' }]);
    const n = await boostsService.expireBoosts();
    expect(mockPrisma.property.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['p1', 'p2'] } }, data: { isBoosted: false, boostExpiresAt: null },
    }));
    expect(n).toBe(2);
  });
  it('renvoie 0 si rien à expirer', async () => {
    mockPrisma.boost.findMany.mockResolvedValue([]);
    expect(await boostsService.expireBoosts()).toBe(0);
  });
});
