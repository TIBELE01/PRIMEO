// Tests des demandes de versement : coordonnées requises, montant minimum, débit du portefeuille,
// recrédit en cas de refus ou d'annulation, pas de double traitement.
const mockTx: Record<string, any> = {
  withdrawalRequest: { count: jest.fn(), create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
};
const mockPrisma: Record<string, any> = {
  payoutAccount: { findUnique: jest.fn() },
  withdrawalRequest: { updateMany: jest.fn() },
  $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(mockTx)),
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));
const mockWallet = { getBalance: jest.fn(), debit: jest.fn(), credit: jest.fn() };
jest.mock('./wallets.service', () => ({ walletService: mockWallet }));

import { withdrawalsService, PayoutAccountDto } from './withdrawals.service';

const account = { method: 'wave', holderName: 'Koffi Yao', accountNumber: '0707010203', bankName: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.payoutAccount.findUnique.mockResolvedValue(account);
  mockTx.withdrawalRequest.count.mockResolvedValue(0);
  mockWallet.getBalance.mockResolvedValue(25000);
});

describe('PayoutAccountDto', () => {
  it('exige le nom de la banque pour un virement bancaire et un numéro valide pour Mobile Money', () => {
    expect(PayoutAccountDto.safeParse({ method: 'bank', holderName: 'A B', accountNumber: 'CI93 0123 4567 8901' }).success).toBe(false);
    expect(PayoutAccountDto.safeParse({ method: 'bank', holderName: 'A B', accountNumber: 'CI93 0123 4567 8901', bankName: 'SIB' }).success).toBe(true);
    expect(PayoutAccountDto.safeParse({ method: 'wave', holderName: 'A B', accountNumber: 'abc' }).success).toBe(false);
    expect(PayoutAccountDto.safeParse({ method: 'wave', holderName: 'A B', accountNumber: '+225 07 07 01 02 03' }).success).toBe(true);
  });
});

describe('withdrawalsService.request', () => {
  it('refuse sans coordonnées de versement', async () => {
    mockPrisma.payoutAccount.findUnique.mockResolvedValue(null);
    await expect(withdrawalsService.request('u1')).rejects.toMatchObject({ statusCode: 400 });
  });
  it('refuse un montant inférieur au minimum et un montant supérieur au solde', async () => {
    await expect(withdrawalsService.request('u1', 500)).rejects.toMatchObject({ statusCode: 400 });
    await expect(withdrawalsService.request('u1', 30000)).rejects.toMatchObject({ statusCode: 422 });
  });
  it('sans montant : demande tout le solde, le débite et copie les coordonnées', async () => {
    mockTx.withdrawalRequest.create.mockResolvedValue({ id: 'w1', amount: 25000, status: 'pending' });
    await withdrawalsService.request('u1');
    expect(mockWallet.debit).toHaveBeenCalledWith('u1', 25000, mockTx);
    expect(mockTx.withdrawalRequest.create.mock.calls[0][0].data).toMatchObject({
      userId: 'u1', amount: 25000, status: 'pending', method: 'wave', accountNumber: '0707010203',
    });
  });
});

describe('withdrawalsService.reject / cancel', () => {
  it('recrédite le montant quand une demande en attente est refusée', async () => {
    mockTx.withdrawalRequest.findUnique.mockResolvedValue({ id: 'w1', userId: 'u1', amount: 8000 });
    mockTx.withdrawalRequest.updateMany.mockResolvedValue({ count: 1 });
    await withdrawalsService.reject('admin', 'w1', 'Numéro invalide');
    expect(mockWallet.credit).toHaveBeenCalledWith('u1', 8000, mockTx);
  });
  it('ne recrédite pas une demande déjà traitée', async () => {
    mockTx.withdrawalRequest.findUnique.mockResolvedValue({ id: 'w1', userId: 'u1', amount: 8000 });
    mockTx.withdrawalRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(withdrawalsService.reject('admin', 'w1', 'x')).rejects.toMatchObject({ statusCode: 400 });
    expect(mockWallet.credit).not.toHaveBeenCalled();
  });
  it('refuse l\'annulation d\'une demande d\'un autre utilisateur', async () => {
    mockTx.withdrawalRequest.findUnique.mockResolvedValue({ id: 'w1', userId: 'other', amount: 8000 });
    await expect(withdrawalsService.cancel('u1', 'w1')).rejects.toMatchObject({ statusCode: 404 });
  });
  it('markPaid : une seule fois', async () => {
    mockPrisma.withdrawalRequest.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await expect(withdrawalsService.markPaid('admin', 'w1', 'WAVE-123')).resolves.toMatchObject({ status: 'paid' });
    await expect(withdrawalsService.markPaid('admin', 'w1')).rejects.toMatchObject({ statusCode: 400 });
  });
});
