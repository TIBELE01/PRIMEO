// Couverture étendue referralsService — code, stats, historique, application
// de code post-inscription, versement conditionnel et réconciliation.
jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../config/env.config', () => ({ env: { FRONTEND_URL: 'http://app.test', BACKEND_URL: 'http://api.test' } }));
jest.mock('../notifications/notifications.service', () => ({ notificationsService: { notify: jest.fn(async () => undefined) } }));
jest.mock('../wallets/wallets.service', () => ({ walletService: { credit: jest.fn(async () => 0) } }));
jest.mock('../../common/handlers/http-error.handler', () => ({
  HttpError: class HttpError extends Error { statusCode: number; constructor(s: number, m: string) { super(m); this.statusCode = s; } },
}));

const mockPrisma: Record<string, any> = {
  user: { findUnique: jest.fn(), findFirst: jest.fn() },
  referral: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(async () => ({})), update: jest.fn(async () => ({})) },
  booking: { count: jest.fn() },
  professionalProfile: { findUnique: jest.fn() },
  transaction: { findMany: jest.fn(), create: jest.fn(async () => ({})) },
};
mockPrisma.$transaction = jest.fn(async (cb: any) => cb({
  referral: { update: jest.fn(async () => ({})) },
  transaction: { create: jest.fn(async () => ({})) },
}));
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { referralsService } from './referrals.service';
import { notificationsService } from '../notifications/notifications.service';
import { walletService } from '../wallets/wallets.service';

const flush = () => new Promise((r) => setTimeout(r, 0));
beforeEach(() => jest.clearAllMocks());

describe('getCode', () => {
  it('expose code, URL et éligibilité (pas encore parrainé)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ referralCode: 'ABC123' });
    mockPrisma.referral.findUnique.mockResolvedValue(null);
    const res = await referralsService.getCode('u1');
    expect(res).toMatchObject({ code: 'ABC123', hasReferrer: false, canApplyCode: true });
    expect(res.referralUrl).toContain('ABC123');
    expect(res.rewards).toEqual({ client: 250, professional: 1000 });
  });
  it('canApplyCode=false si déjà parrainé', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ referralCode: 'X' });
    mockPrisma.referral.findUnique.mockResolvedValue({ id: 'r1' });
    expect((await referralsService.getCode('u1')).canApplyCode).toBe(false);
  });
  it('404 si utilisateur introuvable', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(referralsService.getCode('u1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('getStats / listHistory / listRewardHistory', () => {
  it('agrège totaux et récompenses', async () => {
    mockPrisma.referral.findMany.mockResolvedValue([
      { status: 'rewarded', rewardAmount: 250 }, { status: 'rewarded', rewardAmount: 1000 }, { status: 'pending', rewardAmount: 0 },
    ]);
    const s = await referralsService.getStats('u1');
    expect(s).toEqual({ totalReferrals: 3, rewardedCount: 2, pendingCount: 1, totalRewardsFcfa: 1250 });
  });
  it('listHistory mappe le nom du filleul', async () => {
    mockPrisma.referral.findMany.mockResolvedValue([
      { id: 'r1', status: 'pending', rewardAmount: 0, rewardDate: null, inscriptionDate: null, createdAt: new Date(), referee: { firstName: 'Koffi', lastName: 'Assi', accountType: 'client', createdAt: new Date() } },
    ]);
    const h = await referralsService.listHistory('u1');
    expect(h[0]).toMatchObject({ refereeName: 'Koffi Assi', refereeType: 'client' });
  });
  it('listRewardHistory ne renvoie que les transactions de récompense', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([{ id: 't1', amount: 250, notes: 'x', completedAt: new Date() }]);
    const r = await referralsService.listRewardHistory('u1');
    expect(r[0]).toMatchObject({ amount: 250 });
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1', type: 'referral_reward', status: 'success' },
    }));
  });
});

describe('applyCode', () => {
  it('refuse un code vide', async () => {
    await expect(referralsService.applyCode('u1', '  ')).rejects.toMatchObject({ statusCode: 400 });
  });
  it('refuse si déjà parrainé (409)', async () => {
    mockPrisma.referral.findUnique.mockResolvedValue({ id: 'r1' });
    await expect(referralsService.applyCode('u1', 'CODE')).rejects.toMatchObject({ statusCode: 409 });
  });
  it('refuse un code invalide (404)', async () => {
    mockPrisma.referral.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    await expect(referralsService.applyCode('u1', 'CODE')).rejects.toMatchObject({ statusCode: 404 });
  });
  it('refuse son propre code (400)', async () => {
    mockPrisma.referral.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', referralCode: 'CODE' });
    await expect(referralsService.applyCode('u1', 'CODE')).rejects.toMatchObject({ statusCode: 400 });
  });
  it('crée le parrainage et déclenche le versement', async () => {
    mockPrisma.referral.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'parrain', referralCode: 'CODE' });
    mockPrisma.referral.findFirst.mockResolvedValue(null); // triggerReward: pas de pending → no-op
    const res = await referralsService.applyCode('u1', 'CODE');
    expect(mockPrisma.referral.create).toHaveBeenCalled();
    expect(res.message).toContain('succès');
  });
});

describe('triggerReward', () => {
  it('no-op si aucun parrainage pending', async () => {
    mockPrisma.referral.findFirst.mockResolvedValue(null);
    await referralsService.triggerReward('u1');
    expect(walletService.credit).not.toHaveBeenCalled();
  });
  it('client avec réservation confirmée → crédite 250 et notifie le parrain', async () => {
    mockPrisma.referral.findFirst.mockResolvedValue({
      id: 'r1', referrerId: 'parrain', referee: { firstName: 'Koffi', lastName: 'Assi', accountType: 'client' },
    });
    mockPrisma.booking.count.mockResolvedValue(1);
    await referralsService.triggerReward('u1');
    await flush();
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'referral_reward', recipientId: 'parrain', data: expect.objectContaining({ rewardAmount: 250 }) }));
  });
  it('client sans réservation confirmée → pas de versement', async () => {
    mockPrisma.referral.findFirst.mockResolvedValue({ id: 'r1', referrerId: 'p', referee: { firstName: 'A', lastName: 'B', accountType: 'client' } });
    mockPrisma.booking.count.mockResolvedValue(0);
    await referralsService.triggerReward('u1');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
  it('pro avec KYC approuvé → crédite 1000', async () => {
    mockPrisma.referral.findFirst.mockResolvedValue({ id: 'r1', referrerId: 'p', referee: { firstName: 'A', lastName: 'B', accountType: 'professional_hotel' } });
    mockPrisma.professionalProfile.findUnique.mockResolvedValue({ verificationStatus: 'approved' });
    await referralsService.triggerReward('u1');
    await flush();
    expect(notificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rewardAmount: 1000 }) }));
  });
});

describe('reconcilePendingRewards', () => {
  it('compte les parrainages passés à rewarded', async () => {
    mockPrisma.referral.findMany.mockResolvedValue([{ refereeId: 'a' }, { refereeId: 'b' }]);
    // triggerReward path : a passe rewarded, b reste pending
    mockPrisma.referral.findFirst
      .mockResolvedValueOnce({ id: 'ra' }) // before (a)
      .mockResolvedValueOnce({ id: 'ra', referrerId: 'p', referee: { firstName: 'A', lastName: 'B', accountType: 'client' } }) // trigger (a)
      .mockResolvedValueOnce({ id: 'rb' }) // before (b)
      .mockResolvedValueOnce({ id: 'rb', referrerId: 'p', referee: { firstName: 'C', lastName: 'D', accountType: 'client' } }); // trigger (b)
    mockPrisma.booking.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    mockPrisma.referral.findUnique.mockResolvedValue({ status: 'rewarded' });
    const res = await referralsService.reconcilePendingRewards();
    expect(res.rewarded).toBeGreaterThanOrEqual(1);
    expect(res.errors).toBe(0);
  });
});
