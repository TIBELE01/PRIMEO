// Tests unitaires — paymentsService (initiate, getStatus, listForUser). I/O mockée.

jest.mock('../../config/env.config', () => ({ env: { FRONTEND_URL: 'https://app.test' } }));

const mockInitiate = jest.fn();
jest.mock('./services/genius-pay.service', () => ({
  geniusPayService: { initiatePayment: (...a: unknown[]) => mockInitiate(...a) },
}));

const mockPrisma = {
  booking: { findUnique: jest.fn() },
  transaction: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { paymentsService } from './payments.service';

const booking = {
  id: 'bk-1',
  clientId: 'user-1',
  status: 'pending_payment',
  onlinePaidAmount: 5000,
  client: { email: 'c@test.ci', phone: '+2250700000000', firstName: 'A', lastName: 'B' },
};

describe('paymentsService.initiate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitiate.mockResolvedValue({ checkoutUrl: 'https://pay/co', reference: 'ref-1' });
    mockPrisma.booking.findUnique.mockResolvedValue(booking);
    mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-1' });
  });

  it('crée une transaction initiated et renvoie checkoutUrl + transactionId', async () => {
    const res = await paymentsService.initiate('user-1', { bookingId: 'bk-1' } as never);
    expect(res).toEqual({ checkoutUrl: 'https://pay/co', transactionId: 'tx-1' });
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'initiated', geniusPayTransactionId: 'ref-1' }) }),
    );
  });

  it('404 si la réservation est introuvable', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null);
    await expect(paymentsService.initiate('user-1', { bookingId: 'x' } as never)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('403 si la réservation appartient à un autre utilisateur', async () => {
    await expect(paymentsService.initiate('intrus', { bookingId: 'bk-1' } as never)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('400 si la réservation n\'est pas en attente de paiement', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ ...booking, status: 'confirmed' });
    await expect(paymentsService.initiate('user-1', { bookingId: 'bk-1' } as never)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('400 si aucun montant en ligne à régler', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ ...booking, onlinePaidAmount: 0 });
    await expect(paymentsService.initiate('user-1', { bookingId: 'bk-1' } as never)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('paymentsService.getStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renvoie la transaction', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1', status: 'success' });
    expect(await paymentsService.getStatus('tx-1')).toMatchObject({ id: 'tx-1' });
  });

  it('404 si la transaction est introuvable', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue(null);
    await expect(paymentsService.getStatus('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('paymentsService.listForUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pagine et calcule totalPages', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([{ id: 'tx-1' }]);
    mockPrisma.transaction.count.mockResolvedValue(25);
    const res = await paymentsService.listForUser('user-1', { page: '2', limit: '10' });
    expect(res).toMatchObject({ total: 25, page: 2, limit: 10, totalPages: 3 });
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });

  it('borne la limite à 50 max', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.transaction.count.mockResolvedValue(0);
    const res = await paymentsService.listForUser('user-1', { limit: '999' });
    expect(res.limit).toBe(50);
  });
});
