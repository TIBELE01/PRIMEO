// Tests unitaires — refundService.initiateRefund. Toute I/O externe est mockée.

// ── Mocks — déclarés avant les imports ────────────────────────────────────────

jest.mock('../../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockRefundPayment = jest.fn(async () => ({ reference: 'rfnd-1' }));
jest.mock('./genius-pay.service', () => ({
  geniusPayService: { refundPayment: mockRefundPayment },
}));

const mockPrisma = {
  transaction: {
    findUnique: jest.fn(),
    update: jest.fn(async () => ({})),
    create: jest.fn(async () => ({})),
  },
};
jest.mock('../../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { refundService } from './refund.service';

const eligibleTx = {
  id: 'tx-1',
  userId: 'user-1',
  amount: 1000,
  status: 'success',
  geniusPayTransactionId: 'gp-ref-1',
  bookingId: 'booking-1',
  subscriptionId: null,
};

describe('refundService.initiateRefund', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefundPayment.mockResolvedValue({ reference: 'rfnd-1' });
    mockPrisma.transaction.findUnique.mockResolvedValue(eligibleTx);
  });

  it('rembourse une transaction éligible via Genius Pay (X-API-Key/X-API-Secret)', async () => {
    const result = await refundService.initiateRefund('tx-1', 1000, 'Annulation client');

    expect(mockRefundPayment).toHaveBeenCalledWith({
      originalReference: 'gp-ref-1',
      amount: 1000,
      reason: 'Annulation client',
    });
    // Transaction d'origine marquée refunded
    expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'tx-1' }, data: expect.objectContaining({ status: 'refunded' }) }),
    );
    // Transaction de type refund tracée
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'refund', amount: 1000 }) }),
    );
    expect(result.reference).toBe('rfnd-1');
  });

  it('rejette une transaction inexistante (404)', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue(null);
    await expect(refundService.initiateRefund('absent', 100)).rejects.toMatchObject({ statusCode: 404 });
    expect(mockRefundPayment).not.toHaveBeenCalled();
  });

  it('rejette une transaction non réussie (400)', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({ ...eligibleTx, status: 'failed' });
    await expect(refundService.initiateRefund('tx-1', 100)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejette un montant supérieur au montant payé (400)', async () => {
    await expect(refundService.initiateRefund('tx-1', 5000)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockRefundPayment).not.toHaveBeenCalled();
  });

  it('remonte une 502 si Genius Pay échoue', async () => {
    mockRefundPayment.mockRejectedValue(new Error('network'));
    await expect(refundService.initiateRefund('tx-1', 1000)).rejects.toMatchObject({ statusCode: 502 });
    // L'original ne doit pas être marqué refunded si l'appel échoue
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
  });
});
