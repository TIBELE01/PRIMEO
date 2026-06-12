// Tests des boosts professionnels — gating par formule (Starter/Business/Entreprise)
// et accès role-agnostique (un restaurateur en Business obtient bien un boost).
// Couvre : boost gratuit refusé en Starter, accordé en Business, quota épuisé,
// annonce déjà boostée (409), et boost payant disponible quelle que soit la formule.
jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../config/env.config', () => ({
  env: { FRONTEND_URL: 'http://app.test', BACKEND_URL: 'http://api.test' },
}));
jest.mock('../payments/services/genius-pay.service', () => ({
  geniusPayService: { initiatePayment: jest.fn(async () => ({ checkoutUrl: 'https://pay/checkout', reference: 'GP-REF-1' })) },
}));
jest.mock('../notifications/notifications.service', () => ({
  notificationsService: { notify: jest.fn(async () => undefined) },
}));

const mockPrisma: Record<string, any> = {
  property:     { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
  subscription: { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
  boost:        { create: jest.fn(async () => ({ id: 'boost-1' })) },
  transaction:  { create: jest.fn(async () => ({ id: 'tx-1' })), update: jest.fn(async () => ({})) },
  user:         { findUnique: jest.fn() },
};
mockPrisma.$transaction = jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops));
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { boostsService } from './boosts.service';
import { notificationsService } from '../notifications/notifications.service';
import { geniusPayService } from '../payments/services/genius-pay.service';

const OWNER = 'pro-1';
const PROP = 'prop-1';
const activeProp = { id: PROP, ownerId: OWNER, status: 'active', isBoosted: false, title: 'Resto La Saveur' };

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.property.findUnique.mockResolvedValue(activeProp);
});

describe('boostsService.create — boost gratuit (gating par formule)', () => {
  it('Starter : refuse le boost gratuit (0 boost/mois)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'starter', boostsFreeMonthly: 0, boostsFreeUsedThisMonth: 0 });
    await expect(boostsService.create(OWNER, { propertyId: PROP, type: 'free' } as never))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('boosts gratuits') });
    expect(mockPrisma.boost.create).not.toHaveBeenCalled();
  });

  it('Business : accorde le boost gratuit, marque l\'annonce boostée et incrémente le quota', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business', boostsFreeMonthly: 2, boostsFreeUsedThisMonth: 0 });
    const res = await boostsService.create(OWNER, { propertyId: PROP, type: 'free' } as never);

    expect(res).toMatchObject({ type: 'free', durationDays: 3 });
    expect(mockPrisma.boost.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: OWNER, propertyId: PROP, type: 'free', amount: 0 }),
    }));
    expect(mockPrisma.property.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: PROP }, data: expect.objectContaining({ isBoosted: true }),
    }));
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { boostsFreeUsedThisMonth: { increment: 1 } },
    }));
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'boost_activated', recipientId: OWNER }));
  });

  it('Business : refuse quand le quota mensuel est épuisé', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business', boostsFreeMonthly: 2, boostsFreeUsedThisMonth: 2 });
    await expect(boostsService.create(OWNER, { propertyId: PROP, type: 'free' } as never))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('épuisé') });
  });

  it('Entreprise : accorde le boost gratuit (7/mois)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise', boostsFreeMonthly: 7, boostsFreeUsedThisMonth: 3 });
    const res = await boostsService.create(OWNER, { propertyId: PROP, type: 'free' } as never);
    expect(res).toMatchObject({ type: 'free', durationDays: 3 });
  });

  it('refuse si l\'annonce est déjà boostée (409)', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ ...activeProp, isBoosted: true });
    await expect(boostsService.create(OWNER, { propertyId: PROP, type: 'free' } as never))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('boostsService.create — boost payant (disponible quelle que soit la formule)', () => {
  it('Starter : peut acheter un boost payant (2000 FCFA) — non bloqué par la formule', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'resto@test.ci', firstName: 'Fatou', lastName: 'Bamba', phone: '+2250700000000' });
    const res = await boostsService.create(OWNER, { propertyId: PROP, type: 'paid' } as never);

    expect(res).toMatchObject({ type: 'paid', amount: 2000, checkoutUrl: expect.any(String) });
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: OWNER, type: 'boost_purchase', amount: 2000 }),
    }));
    expect(geniusPayService.initiatePayment).toHaveBeenCalled();
  });
});
