// Tests unitaires de la distribution des récompenses de parrainage.
// Vérifie : montants différenciés (client 250 / pro 1000), conditions de versement,
// idempotence, et notification au parrain. Toutes les I/O externes sont mockées.

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../config/env.config', () => ({
  env: { BACKEND_URL: 'http://localhost:3000', FRONTEND_URL: '' },
}));

const notifyMock = jest.fn(async () => undefined);
jest.mock('../notifications/notifications.service', () => ({
  notificationsService: { notify: notifyMock },
}));

const creditMock = jest.fn(async () => 0);
jest.mock('../wallets/wallets.service', () => ({
  walletService: { credit: creditMock },
}));

const mockPrisma = {
  referral: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  booking: {
    count: jest.fn(),
  },
  professionalProfile: {
    findUnique: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};
// $transaction(fn) exécute le callback avec un client transactionnel = le mock lui-même
mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma));
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { referralsService } from './referrals.service';

describe('referralsService.triggerReward', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.booking.count.mockResolvedValue(0);
    mockPrisma.professionalProfile.findUnique.mockResolvedValue(null);
  });

  it('ne fait rien si aucun parrainage en attente', async () => {
    mockPrisma.referral.findFirst.mockResolvedValue(null);

    await referralsService.triggerReward('referee-1');

    expect(creditMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('crédite 250 FCFA au parrain pour un filleul client ayant un séjour terminé', async () => {
    mockPrisma.referral.findFirst.mockResolvedValue({
      id: 'ref-1',
      referrerId: 'parrain-1',
      referee: { firstName: 'Koffi', lastName: 'K.', accountType: 'client' },
    });
    mockPrisma.booking.count.mockResolvedValue(1); // condition remplie

    await referralsService.triggerReward('referee-1');

    expect(creditMock).toHaveBeenCalledWith('parrain-1', 250, expect.anything());
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 250, type: 'referral_reward' }) }),
    );
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'referral_reward', recipientId: 'parrain-1', data: expect.objectContaining({ rewardAmount: 250 }) }),
    );
  });

  it('ne verse pas si le filleul client n\'a aucun séjour terminé (réservation seulement confirmée)', async () => {
    mockPrisma.referral.findFirst.mockResolvedValue({
      id: 'ref-1',
      referrerId: 'parrain-1',
      referee: { firstName: 'Koffi', lastName: 'K.', accountType: 'client' },
    });
    mockPrisma.booking.count.mockResolvedValue(0); // condition non remplie

    await referralsService.triggerReward('referee-1');

    expect(creditMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('la condition client exige une réservation « terminée » dont le départ est passé', async () => {
    mockPrisma.referral.findFirst.mockResolvedValue({
      id: 'ref-1',
      referrerId: 'parrain-1',
      referee: { firstName: 'Koffi', lastName: 'K.', accountType: 'client' },
    });
    mockPrisma.booking.count.mockResolvedValue(0);

    await referralsService.triggerReward('referee-1');

    const where = mockPrisma.booking.count.mock.calls[0][0].where;
    expect(where.status).toBe('completed'); // « confirmée » ne suffit plus
    // Jour de départ atteint : une clôture le jour même du départ compte aussitôt
    expect(where.endDate.lte).toBeInstanceOf(Date);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);
    expect(where.endDate.lte.getTime()).toBe(endOfToday.getTime());
  });

  it('séjour clôturé le jour du départ → parrainage « rewarded » immédiatement et parrain crédité', async () => {
    mockPrisma.referral.findFirst.mockResolvedValue({
      id: 'ref-today',
      referrerId: 'parrain-today',
      referee: { firstName: 'Awa', lastName: 'K.', accountType: 'client' },
    });
    mockPrisma.booking.count.mockResolvedValue(1);
    const tx = { referral: { update: jest.fn(async () => ({})) }, transaction: { create: jest.fn(async () => ({})) } };
    mockPrisma.$transaction.mockImplementationOnce(async (cb: any) => cb(tx));

    await referralsService.triggerReward('referee-today');

    expect(tx.referral.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'ref-today' },
      data: expect.objectContaining({ status: 'rewarded', rewardAmount: 250 }),
    }));
  });

  it('crédite 1000 FCFA au parrain pour un filleul professionnel au KYC approuvé', async () => {
    mockPrisma.referral.findFirst.mockResolvedValue({
      id: 'ref-2',
      referrerId: 'parrain-2',
      referee: { firstName: 'Awa', lastName: 'B.', accountType: 'professional_hebergement' },
    });
    mockPrisma.professionalProfile.findUnique.mockResolvedValue({ verificationStatus: 'approved' });

    await referralsService.triggerReward('referee-2');

    expect(creditMock).toHaveBeenCalledWith('parrain-2', 1000, expect.anything());
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rewardAmount: 1000 }) }),
    );
  });

  it('ne verse pas si le KYC du filleul pro n\'est pas approuvé', async () => {
    mockPrisma.referral.findFirst.mockResolvedValue({
      id: 'ref-2',
      referrerId: 'parrain-2',
      referee: { firstName: 'Awa', lastName: 'B.', accountType: 'professional_hebergement' },
    });
    mockPrisma.professionalProfile.findUnique.mockResolvedValue({ verificationStatus: 'pending' });

    await referralsService.triggerReward('referee-2');

    expect(creditMock).not.toHaveBeenCalled();
  });
});
