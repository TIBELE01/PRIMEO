// Task 56 — Test du reset mensuel des boosts gratuits (1er du mois)
//
// Simule le passage du cron et vérifie que :
//   - Business (2/mois) et Entreprise (7/mois) actifs sont remis à zéro
//   - Les boosts PAYANTS (table boost) ne sont jamais touchés
//   - Seuls les abonnements actifs avec compteur > 0 sont ciblés

jest.mock('../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

const mockPrisma = {
  subscription: { updateMany: jest.fn() },
  boost: { updateMany: jest.fn(), deleteMany: jest.fn(), update: jest.fn() },
};
jest.mock('../database/prisma.service', () => ({ prisma: mockPrisma }));

import { resetFreeBoosts } from './boost-reset.job';

describe('resetFreeBoosts — reset mensuel des boosts gratuits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 });
  });

  it('cible uniquement les abonnements actifs Business + Entreprise', async () => {
    await resetFreeBoosts();
    expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'active',
          planType: { in: ['business', 'entreprise'] },
        }),
      }),
    );
  });

  it('remet le compteur boostsFreeUsedThisMonth à zéro', async () => {
    await resetFreeBoosts();
    expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { boostsFreeUsedThisMonth: 0 },
      }),
    );
  });

  it('ne réinitialise que les abonnements ayant déjà consommé des boosts (> 0)', async () => {
    await resetFreeBoosts();
    expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          boostsFreeUsedThisMonth: { gt: 0 },
        }),
      }),
    );
  });

  it('retourne le nombre d\'abonnements réinitialisés', async () => {
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 12 });
    const count = await resetFreeBoosts();
    expect(count).toBe(12);
  });

  it('NE TOUCHE JAMAIS les boosts payants (table boost intacte)', async () => {
    await resetFreeBoosts();
    expect(mockPrisma.boost.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.boost.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.boost.update).not.toHaveBeenCalled();
  });

  it('n\'inclut pas le plan Starter (aucun boost gratuit)', async () => {
    await resetFreeBoosts();
    const call = mockPrisma.subscription.updateMany.mock.calls[0]![0];
    expect(call.where.planType.in).not.toContain('starter');
  });

  it('propage les erreurs Prisma (gérées par le wrapper cron)', async () => {
    mockPrisma.subscription.updateMany.mockRejectedValue(new Error('DB down'));
    await expect(resetFreeBoosts()).rejects.toThrow('DB down');
  });
});
