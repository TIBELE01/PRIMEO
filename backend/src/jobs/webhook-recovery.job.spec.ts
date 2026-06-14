// Task 61 — Simulation d'une panne du webhook Genius Pay (timeout / 500)
//
// Le webhook payment.success peut ne jamais arriver (timeout réseau, 500 côté
// Genius Pay). Le job horaire de récupération doit alors sonder l'API Genius Pay
// (getPaymentStatus) et appliquer le bon handler, sans bloquer indéfiniment la
// réservation : une transaction toujours "pending" est laissée pour le run suivant,
// une erreur de sondage est attrapée et n'interrompt pas le traitement des autres.

jest.mock('../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

const mockGetPaymentStatus = jest.fn();
jest.mock('../modules/payments/services/genius-pay.service', () => ({
  geniusPayService: { getPaymentStatus: (...a: unknown[]) => mockGetPaymentStatus(...a) },
}));

const mockHandleSuccess = jest.fn().mockResolvedValue(undefined);
const mockHandleFailed = jest.fn().mockResolvedValue(undefined);
jest.mock('../modules/webhooks/handlers/genius-pay.handler', () => ({
  handlePaymentSuccess: (...a: unknown[]) => mockHandleSuccess(...a),
  handlePaymentFailed: (...a: unknown[]) => mockHandleFailed(...a),
}));

const mockPrisma = {
  transaction: { findMany: jest.fn() },
};
jest.mock('../database/prisma.service', () => ({ prisma: mockPrisma }));

import { recoverPendingTransactions } from './webhook-recovery.job';

const stuckTx = (id: string, ref: string, amount = 50_000) => ({
  id,
  bookingId: `bk-${id}`,
  geniusPayTransactionId: ref,
  amount,
});

describe('recoverPendingTransactions — récupération après panne webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Sélection des transactions bloquées ─────────────────────────────────────

  it('ne sonde que les transactions initiated, client_payment, > 10 min', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    await recoverPendingTransactions();

    const where = mockPrisma.transaction.findMany.mock.calls[0]![0].where;
    expect(where.status).toBe('initiated');
    expect(where.type).toBe('client_payment');
    expect(where.geniusPayTransactionId).toEqual({ not: null });
    expect(where.initiatedAt.lt).toBeInstanceOf(Date);
    // Le seuil doit être ~10 min dans le passé
    expect(where.initiatedAt.lt.getTime()).toBeLessThan(Date.now() - 9 * 60 * 1000);
  });

  it('ne fait rien si aucune transaction bloquée', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    await recoverPendingTransactions();
    expect(mockGetPaymentStatus).not.toHaveBeenCalled();
    expect(mockHandleSuccess).not.toHaveBeenCalled();
    expect(mockHandleFailed).not.toHaveBeenCalled();
  });

  // ── Paiement réellement réussi → confirmation ───────────────────────────────

  it('confirme la réservation quand Genius Pay répond success', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([stuckTx('1', 'REF-OK', 75_000)]);
    mockGetPaymentStatus.mockResolvedValue({ status: 'success', amount: 75_000 });

    await recoverPendingTransactions();

    expect(mockGetPaymentStatus).toHaveBeenCalledWith('REF-OK');
    expect(mockHandleSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ reference: 'REF-OK', amount: 75_000, recovered: true }),
    );
    expect(mockHandleFailed).not.toHaveBeenCalled();
  });

  it('accepte aussi le statut "paid" comme succès', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([stuckTx('1', 'REF-PAID')]);
    mockGetPaymentStatus.mockResolvedValue({ status: 'paid', amount: 50_000 });

    await recoverPendingTransactions();
    expect(mockHandleSuccess).toHaveBeenCalled();
  });

  // ── Paiement échoué → annulation ────────────────────────────────────────────

  it.each(['failed', 'cancelled', 'expired'])(
    'annule la réservation quand Genius Pay répond %s',
    async (status) => {
      mockPrisma.transaction.findMany.mockResolvedValue([stuckTx('1', 'REF-KO')]);
      mockGetPaymentStatus.mockResolvedValue({ status, amount: 0 });

      await recoverPendingTransactions();

      expect(mockHandleFailed).toHaveBeenCalledWith(
        expect.objectContaining({ reference: 'REF-KO', recovered: true }),
      );
      expect(mockHandleSuccess).not.toHaveBeenCalled();
    },
  );

  // ── Toujours en attente → on ne bloque pas, on réessaiera ───────────────────

  it('laisse la transaction pour le run suivant si toujours pending', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([stuckTx('1', 'REF-PENDING')]);
    mockGetPaymentStatus.mockResolvedValue({ status: 'pending', amount: 0 });

    await recoverPendingTransactions();

    expect(mockHandleSuccess).not.toHaveBeenCalled();
    expect(mockHandleFailed).not.toHaveBeenCalled();
  });

  // ── Panne du sondage (timeout / 500) → pas de crash, on continue ────────────

  it('attrape un timeout/500 du sondage sans interrompre les autres transactions', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([
      stuckTx('1', 'REF-TIMEOUT'),
      stuckTx('2', 'REF-OK', 60_000),
    ]);
    mockGetPaymentStatus
      .mockRejectedValueOnce(new Error('ETIMEDOUT')) // 1re transaction : timeout
      .mockResolvedValueOnce({ status: 'success', amount: 60_000 }); // 2e : OK

    // Ne doit pas throw malgré le timeout sur la 1re
    await expect(recoverPendingTransactions()).resolves.toBeUndefined();

    // La 2e transaction est tout de même traitée
    expect(mockHandleSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ reference: 'REF-OK', amount: 60_000 }),
    );
  });

  it('une transaction en timeout n\'est ni confirmée ni annulée (reste récupérable)', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([stuckTx('1', 'REF-500')]);
    mockGetPaymentStatus.mockRejectedValue(new Error('Request failed with status code 500'));

    await recoverPendingTransactions();

    // Aucun handler appelé → la transaction reste "initiated" pour le prochain cycle
    expect(mockHandleSuccess).not.toHaveBeenCalled();
    expect(mockHandleFailed).not.toHaveBeenCalled();
  });
});
