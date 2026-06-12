// Tests des reversements pros : calcul du net (frais GP), crédit du portefeuille,
// idempotence (bookingId unique), et exclusion des réservations remboursées.
jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../wallets/wallets.service', () => ({
  walletService: { credit: jest.fn(async () => 0) },
}));

const mockPrisma: Record<string, any> = {
  platformConfig: { findUnique: jest.fn() },
  booking: { findMany: jest.fn() },
  payout: { create: jest.fn(async () => ({ id: 'po-1' })), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  transaction: { create: jest.fn(async () => ({ id: 'tx-1' })) },
};
mockPrisma.$transaction = jest.fn(async (cb: any) =>
  cb({
    payout: { create: mockPrisma.payout.create },
    transaction: { create: mockPrisma.transaction.create },
  }),
);
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

// Réexpose Prisma.Decimal + l'erreur P2002 pour le service
jest.mock('@prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(m: string, params: { code: string }) { super(m); this.code = params.code; }
  }
  return { Prisma: { Decimal: class { constructor(public v: number) {} }, PrismaClientKnownRequestError } };
});

import { payoutsService } from './payouts.service';
import { walletService } from '../wallets/wallets.service';
import { Prisma } from '@prisma/client';

const OWNER = 'pro-1';
const booking = (id: string, online: number) => ({
  id, onlinePaidAmount: online, property: { ownerId: OWNER, title: 'Villa' },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.platformConfig.findUnique.mockResolvedValue(null); // pas de frais configurés
});

describe('runDailyPayouts — calcul & crédit', () => {
  it('frais 0 % (défaut) : crédite l\'intégralité de la part payée en ligne', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([booking('bk-1', 50000)]);
    const res = await payoutsService.runDailyPayouts();

    expect(res).toMatchObject({ processed: 1, totalNet: 50000, errors: 0 });
    expect(walletService.credit).toHaveBeenCalledWith(OWNER, 50000, expect.anything());
    expect(mockPrisma.payout.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ bookingId: 'bk-1', professionalId: OWNER, grossAmount: 50000, feeAmount: 0, netAmount: 50000 }),
    }));
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'payout_to_professional', userId: OWNER, amount: 50000 }),
    }));
  });

  it('frais 2,5 % : déduit les frais Genius Pay du net crédité', async () => {
    mockPrisma.platformConfig.findUnique.mockResolvedValue({ key: 'genius_pay_fee_percent', value: 2.5 });
    mockPrisma.booking.findMany.mockResolvedValue([booking('bk-2', 100000)]);
    const res = await payoutsService.runDailyPayouts();

    // 100000 * 2.5% = 2500 de frais → net 97500
    expect(res).toMatchObject({ processed: 1, totalNet: 97500 });
    expect(walletService.credit).toHaveBeenCalledWith(OWNER, 97500, expect.anything());
    expect(mockPrisma.payout.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ feeAmount: 2500, netAmount: 97500 }),
    }));
  });

  it('idempotent : un doublon (P2002) est ignoré sans erreur ni double crédit', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([booking('bk-3', 30000)]);
    mockPrisma.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }));
    const res = await payoutsService.runDailyPayouts();
    expect(res).toMatchObject({ processed: 0, errors: 0 }); // doublon silencieux
  });

  it('ignore un net nul ou négatif (frais ≥ montant)', async () => {
    mockPrisma.platformConfig.findUnique.mockResolvedValue({ key: 'genius_pay_fee_percent', value: 0 });
    mockPrisma.booking.findMany.mockResolvedValue([booking('bk-4', 0)]);
    const res = await payoutsService.runDailyPayouts();
    expect(res.processed).toBe(0);
    expect(walletService.credit).not.toHaveBeenCalled();
  });
});

describe('runDailyPayouts — filtre d\'éligibilité', () => {
  it('ne sélectionne que confirmed/completed, payées en ligne, sans payout, sans remboursement', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);
    await payoutsService.runDailyPayouts();
    const where = mockPrisma.booking.findMany.mock.calls[0][0].where;
    expect(where.status).toEqual({ in: ['confirmed', 'completed'] });
    expect(where.paymentOption).toEqual({ in: ['full_online', 'ten_percent_online'] });
    expect(where.payout).toEqual({ is: null });
    expect(where.transactions.some).toEqual({ type: 'client_payment', status: 'success' });
    expect(where.transactions.none).toEqual({ type: 'refund', status: 'success' });
  });
});
