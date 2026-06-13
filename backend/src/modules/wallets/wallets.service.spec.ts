// Couverture walletService — source de vérité du portefeuille virtuel.
jest.mock('../../common/handlers/http-error.handler', () => ({
  HttpError: class HttpError extends Error { statusCode: number; constructor(s: number, m: string) { super(m); this.statusCode = s; } },
}));

const mockPrisma: Record<string, any> = {
  wallet: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { walletService } from './wallets.service';

beforeEach(() => jest.clearAllMocks());

describe('walletService.getOrCreate', () => {
  it('renvoie le solde d\'un wallet existant', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 7000, currency: 'XOF' });
    await expect(walletService.getOrCreate('u1')).resolves.toEqual({ balance: 7000, currency: 'XOF' });
    expect(mockPrisma.wallet.create).not.toHaveBeenCalled();
  });

  it('crée le wallet et reprend le walletBalance hérité (backfill)', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ walletBalance: 5000 });
    mockPrisma.wallet.create.mockResolvedValue({ balance: 5000, currency: 'XOF' });
    const res = await walletService.getOrCreate('u1');
    expect(mockPrisma.wallet.create).toHaveBeenCalledWith({ data: { userId: 'u1', balance: 5000 } });
    expect(res.balance).toBe(5000);
  });

  it('crée un wallet à 0 si aucun solde hérité', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.wallet.create.mockResolvedValue({ balance: 0, currency: 'XOF' });
    await walletService.getOrCreate('u1');
    expect(mockPrisma.wallet.create).toHaveBeenCalledWith({ data: { userId: 'u1', balance: 0 } });
  });
});

describe('walletService.getBalance', () => {
  it('renvoie le solde courant', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 1200, currency: 'XOF' });
    await expect(walletService.getBalance('u1')).resolves.toBe(1200);
  });
});

describe('walletService.credit', () => {
  it('crédite et reflète le solde sur users.walletBalance', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 1000, currency: 'XOF' });
    mockPrisma.wallet.update.mockResolvedValue({ balance: 3000 });
    const bal = await walletService.credit('u1', 2000);
    expect(mockPrisma.wallet.update).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { balance: { increment: 2000 } } });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { walletBalance: 3000 } });
    expect(bal).toBe(3000);
  });

  it('refuse un montant ≤ 0', async () => {
    await expect(walletService.credit('u1', 0)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('walletService.debit', () => {
  it('débite si le solde est suffisant', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 5000, currency: 'XOF' });
    mockPrisma.wallet.update.mockResolvedValue({ balance: 2000 });
    const bal = await walletService.debit('u1', 3000);
    expect(mockPrisma.wallet.update).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { balance: { decrement: 3000 } } });
    expect(bal).toBe(2000);
  });

  it('refuse si solde insuffisant (422)', async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 1000, currency: 'XOF' });
    await expect(walletService.debit('u1', 3000)).rejects.toMatchObject({ statusCode: 422 });
  });

  it('refuse un montant ≤ 0', async () => {
    await expect(walletService.debit('u1', -5)).rejects.toMatchObject({ statusCode: 400 });
  });
});
