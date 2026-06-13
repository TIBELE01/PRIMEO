// Couverture subscriptionsService + updatePlanBenefits (contextes upgrade /
// downgrade / payment_failure / reactivation), changement de formule, factures.
jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../config/env.config', () => ({ env: { FRONTEND_URL: 'http://app.test', BACKEND_URL: 'http://api.test' } }));
jest.mock('../payments/services/genius-pay.service', () => ({
  geniusPayService: { initiatePayment: jest.fn(async () => ({ checkoutUrl: 'https://pay/x', reference: 'GP-1' })) },
}));
jest.mock('../notifications/notifications.service', () => ({ notificationsService: { notify: jest.fn(async () => undefined) } }));
jest.mock('../../common/handlers/http-error.handler', () => ({
  HttpError: class HttpError extends Error { statusCode: number; constructor(s: number, m: string) { super(m); this.statusCode = s; } },
}));

const mockPrisma: Record<string, any> = {
  subscription: { findUnique: jest.fn(), create: jest.fn(async () => ({ id: 'sub-1' })), update: jest.fn(async () => ({})) },
  user: { findUnique: jest.fn() },
  property: { findMany: jest.fn(async () => []), updateMany: jest.fn(async () => ({})) },
  transaction: { create: jest.fn(async () => ({ id: 'tx-1' })), update: jest.fn(async () => ({})), findUnique: jest.fn(), findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
  auditLog: { create: jest.fn(async () => ({})) },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { subscriptionsService, updatePlanBenefits } from './subscriptions.service';
import { notificationsService } from '../notifications/notifications.service';
import { geniusPayService } from '../payments/services/genius-pay.service';

const flush = () => new Promise((r) => setTimeout(r, 0));
const sub = (over: Record<string, unknown> = {}) => ({
  id: 'sub-1', userId: 'u1', planType: 'starter', status: 'active', features: {},
  monthlyPrice: 0, boostsFreeMonthly: 0, boostsFreeUsedThisMonth: 0,
  nextBillingDate: new Date('2026-07-01'), ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'professional_hebergement' });
});

describe('updatePlanBenefits', () => {
  it('upgrade : crédite les boosts du mois, réactive les annonces, notifie upgraded', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ planType: 'starter' }));
    const res = await updatePlanBenefits('u1', 'business', 'upgrade');
    await flush();
    expect(res.previousPlan).toBe('starter');
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ planType: 'business', boostsFreeUsedThisMonth: 0 }),
    }));
    // réactivation des annonces suspendues
    expect(mockPrisma.property.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ownerId: 'u1', status: 'suspended' }, data: { status: 'active' },
    }));
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'subscription_upgraded' }));
  });

  it('downgrade : suspend les annonces excédentaires (>limite Starter=3) + notify downgraded', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ planType: 'business', monthlyPrice: 9000 }));
    mockPrisma.property.findMany.mockResolvedValue([
      { id: 'p1', title: 'A' }, { id: 'p2', title: 'B' }, { id: 'p3', title: 'C' }, { id: 'p4', title: 'D' }, { id: 'p5', title: 'E' },
    ]);
    const res = await updatePlanBenefits('u1', 'starter', 'downgrade');
    await flush();
    expect(res.suspendedProperties).toHaveLength(2); // 5 - 3
    expect(mockPrisma.property.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'suspended' },
    }));
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'subscription_downgraded' }));
  });

  it('payment_failure : mémorise suspendedFromPlan + notify suspended', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ planType: 'business', monthlyPrice: 9000 }));
    await updatePlanBenefits('u1', 'starter', 'payment_failure');
    await flush();
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ features: expect.objectContaining({ suspendedFromPlan: 'business' }) }),
    }));
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'subscription_suspended' }));
  });

  it('reactivation : statut actif + réactive annonces + notify reactivated', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ planType: 'starter', status: 'suspended' }));
    await updatePlanBenefits('u1', 'business', 'reactivation');
    await flush();
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'subscription_reactivated' }));
  });

  it('404 si aucun abonnement', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    await expect(updatePlanBenefits('u1', 'business', 'upgrade')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('getForUser / createInitial', () => {
  it('crée la formule Starter si absente puis sérialise', async () => {
    mockPrisma.subscription.findUnique
      .mockResolvedValueOnce(null)              // getForUser : absent
      .mockResolvedValueOnce(null)              // createInitial : absent
      .mockResolvedValueOnce(sub({ transactions: [] })); // relecture
    const res = await subscriptionsService.getForUser('u1');
    expect(mockPrisma.subscription.create).toHaveBeenCalled();
    expect(res).toMatchObject({ plan: 'starter', monthlyCost: 0 });
  });

  it('createInitial est idempotent', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ id: 'sub-1' });
    await subscriptionsService.createInitial('u1');
    expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
  });
});

describe('upgrade', () => {
  it('rétrogradation : programmée (pendingPlanType), sans paiement', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ planType: 'business', monthlyPrice: 9000 }));
    const res = await subscriptionsService.upgrade('u1', { plan: 'starter' } as never);
    expect(res).toMatchObject({ requiresPayment: false, scheduled: true, pendingPlan: 'starter' });
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { features: expect.objectContaining({ pendingPlanType: 'starter' }) },
    }));
  });

  it('montée en gamme : crée la transaction + initie Genius Pay', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ planType: 'starter', monthlyPrice: 0 }));
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'p@test.ci', firstName: 'A', lastName: 'B', phone: '+2250700000000' });
    const res = await subscriptionsService.upgrade('u1', { plan: 'business' } as never);
    expect(res).toMatchObject({ requiresPayment: true, checkoutUrl: 'https://pay/x', plan: 'business' });
    expect(geniusPayService.initiatePayment).toHaveBeenCalled();
  });

  it('refuse si déjà sur la formule active', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ planType: 'business', status: 'active' }));
    await expect(subscriptionsService.upgrade('u1', { plan: 'business' } as never)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse la montée en gamme sans téléphone', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ planType: 'starter', monthlyPrice: 0 }));
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'p@test.ci', firstName: 'A', lastName: 'B', phone: null });
    await expect(subscriptionsService.upgrade('u1', { plan: 'business' } as never)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('applyPaidPlanChange', () => {
  it('applique le plan après paiement (upgrade)', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', type: 'subscription_payment', subscriptionId: 'sub-1', notes: 'business' });
    mockPrisma.subscription.findUnique.mockResolvedValue(sub({ planType: 'starter', status: 'active' }));
    await subscriptionsService.applyPaidPlanChange('tx-1');
    expect(mockPrisma.subscription.update).toHaveBeenCalled(); // nextBillingDate + updatePlanBenefits
  });

  it('ignore une transaction non liée à un abonnement', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', type: 'client_payment', subscriptionId: null });
    await subscriptionsService.applyPaidPlanChange('tx-1');
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });
});

describe('cancel / listInvoices / listPlans', () => {
  it('cancel passe le statut à cancelled', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub());
    await subscriptionsService.cancel('u1');
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'cancelled' }),
    }));
  });
  it('listInvoices pagine les transactions d\'abonnement', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub());
    mockPrisma.transaction.findMany.mockResolvedValue([{ id: 't1' }]);
    mockPrisma.transaction.count.mockResolvedValue(1);
    const res = await subscriptionsService.listInvoices('u1', 1, 20);
    expect(res).toMatchObject({ total: 1, page: 1, pages: 1 });
  });
  it('listPlans expose les 3 formules avec capacités', async () => {
    const plans = await subscriptionsService.listPlans('professional_hebergement');
    expect(plans.map((p) => p.key)).toEqual(expect.arrayContaining(['starter', 'business', 'entreprise']));
    const ent = plans.find((p) => p.key === 'entreprise')!;
    expect(ent).toMatchObject({ virtualTour: true, multiUser: true, freeBoostsPerMonth: 7 });
  });
});
