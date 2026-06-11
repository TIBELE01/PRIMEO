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

  it('crédite 250 FCFA au parrain pour un filleul client ayant une réservation confirmée', async () => {
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

  it('ne verse pas si le filleul client n\'a aucune réservation confirmée', async () => {
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
