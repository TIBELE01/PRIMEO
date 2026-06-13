// Tests des publications supplémentaires (500 FCFA/slot/mois) :
// achat prorata, activation post-paiement, résiliation programmée, limite effective.
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../config/env.config', () => ({ env: { FRONTEND_URL: 'http://app.test', BACKEND_URL: 'http://api.test' } }));
jest.mock('../payments/services/genius-pay.service', () => ({
  geniusPayService: { initiatePayment: jest.fn(async () => ({ checkoutUrl: 'https://pay/x', reference: 'GP-1' })) },
}));
jest.mock('../notifications/notifications.service', () => ({ notificationsService: { notify: jest.fn(async () => undefined) } }));
jest.mock('../../common/handlers/http-error.handler', () => ({
  HttpError: class HttpError extends Error { statusCode: number; constructor(s: number, m: string) { super(m); this.statusCode = s; } },
}));

const mockPrisma: Record<string, any> = {
  subscription: { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
  user: { findUnique: jest.fn() },
  transaction: { create: jest.fn(async () => ({ id: 'tx-1' })), update: jest.fn(async () => ({})), findUnique: jest.fn() },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { subscriptionsService } from './subscriptions.service';
import { geniusPayService } from '../payments/services/genius-pay.service';
import { effectivePublicationLimit, EXTRA_PUBLICATION_SLOT_FCFA } from '../../common/constants/subscription-plans';

const sub = (over: Record<string, unknown> = {}) => ({
  id: 'sub-1', userId: 'u1', planType: 'business', status: 'active', features: {},
  extraPublicationSlots: 0, nextBillingDate: new Date('2026-08-01'), ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'professional_hebergement', email: 'p@test.ci', firstName: 'A', lastName: 'B', phone: '+2250700000000' });
});

describe('effectivePublicationLimit', () => {
  it('ajoute les slots à la limite de la formule', () => {
    // Business (hébergement) = 10 ; +3 slots = 13
    expect(effectivePublicationLimit('business', 'professional_hebergement', 3)).toBe(13);
    expect(effectivePublicationLimit('starter', 'professional_hebergement', 0)).toBe(3);
  });
});

describe('getSlotsInfo', () => {
  it('renvoie limite de base, slots, limite effective et coût mensuel', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ extraPublicationSlots: 2, features: { pendingSlotRemoval: 1 } }));
    const info = await subscriptionsService.getSlotsInfo('u1');
    expect(info).toMatchObject({
      baseLimit: 10, extraSlots: 2, effectiveLimit: 12,
      pricePerSlotFcfa: EXTRA_PUBLICATION_SLOT_FCFA,
      monthlySlotsCostFcfa: 2 * 500, pendingRemoval: 1,
    });
  });
});

describe('purchaseSlots', () => {
  it('crée une transaction marquée extra_slots et initie Genius Pay (prorata)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub());
    const res = await subscriptionsService.purchaseSlots('u1', 3);
    expect(res).toMatchObject({ requiresPayment: true, checkoutUrl: 'https://pay/x', quantity: 3, fullMonthAmount: 1500 });
    // Prorata ≤ plein mois, ≥ 1
    expect(res.proratedAmount).toBeGreaterThan(0);
    expect(res.proratedAmount).toBeLessThanOrEqual(1500);
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'subscription_payment', notes: 'extra_slots:3' }),
    }));
    expect(geniusPayService.initiatePayment).toHaveBeenCalled();
  });

  it('refuse une quantité invalide', async () => {
    await expect(subscriptionsService.purchaseSlots('u1', 0)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse sans téléphone', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub());
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'p@test.ci', firstName: 'A', lastName: 'B', phone: null });
    await expect(subscriptionsService.purchaseSlots('u1', 1)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('activatePurchasedSlots', () => {
  it('incrémente extraPublicationSlots de la quantité achetée', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', type: 'subscription_payment', subscriptionId: 'sub-1', notes: 'extra_slots:3' });
    await subscriptionsService.activatePurchasedSlots('tx-1');
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sub-1' }, data: { extraPublicationSlots: { increment: 3 } },
    }));
  });

  it('ignore une transaction sans marqueur extra_slots', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', type: 'subscription_payment', subscriptionId: 'sub-1', notes: 'business' });
    await subscriptionsService.activatePurchasedSlots('tx-1');
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });
});

describe('cancelSlots', () => {
  it('programme le retrait à l\'échéance (pendingSlotRemoval)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ extraPublicationSlots: 3, features: {} }));
    const res = await subscriptionsService.cancelSlots('u1', 2);
    expect(res).toMatchObject({ scheduled: true, pendingRemoval: 2 });
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { features: expect.objectContaining({ pendingSlotRemoval: 2 }) },
    }));
  });

  it('plafonne le retrait au nombre de slots actifs', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ extraPublicationSlots: 2, features: { pendingSlotRemoval: 1 } }));
    const res = await subscriptionsService.cancelSlots('u1', 5);
    expect(res.pendingRemoval).toBe(2); // min(2, 1+5)
  });

  it('refuse s\'il n\'y a aucun slot actif', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ extraPublicationSlots: 0 }));
    await expect(subscriptionsService.cancelSlots('u1', 1)).rejects.toMatchObject({ statusCode: 400 });
  });
});
