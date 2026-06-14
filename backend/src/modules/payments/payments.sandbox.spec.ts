// Task 38 — 3 options de paiement en mode sandbox
//
// Sandbox Genius Pay : surcharger GENIUS_PAY_API_URL=https://sandbox.genius.ci/api/v1/merchant
// dans .env.test (ou via CI_SECRET) pour pointer vers l'environnement de test Genius Pay.
// Ici, le service Genius Pay est mocké pour isoler les tests unitaires et vérifier
// les montants exacts envoyés pour chaque option de paiement.
//
// Montants de référence sandbox :
//   Séjour 3 nuits × 75 000 FCFA = 225 000 FCFA total
//   full_online        → 225 000 FCFA en ligne
//   ten_percent_online → 22 500 FCFA en ligne (10 %, arrondi au supérieur)
//   zero_online        → 0 FCFA en ligne (paiement 100 % espèces, confirmé immédiatement)

jest.mock('../../config/env.config', () => ({
  env: {
    FRONTEND_URL: 'https://app-sandbox.test',
    GENIUS_PAY_API_URL: 'https://sandbox.genius.ci/api/v1/merchant',
  },
}));

const mockGeniusInitiate = jest.fn();
jest.mock('./services/genius-pay.service', () => ({
  geniusPayService: { initiatePayment: (...a: unknown[]) => mockGeniusInitiate(...a) },
}));

const mockPrisma = {
  booking: { findUnique: jest.fn() },
  transaction: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { paymentsService } from './payments.service';

// ── Fixtures sandbox ──────────────────────────────────────────────────────────

// 3 nuits × 75 000 FCFA = 225 000 FCFA
const NIGHTLY_RATE = 75_000;
const NIGHTS = 3;
const TOTAL = NIGHTLY_RATE * NIGHTS; // 225 000

const client = {
  email: 'client.sandbox@test.ci',
  phone: '+2250701234567',
  firstName: 'Kouamé',
  lastName: 'Diallo',
};

function makeBooking(onlinePaidAmount: number) {
  return {
    id: `bk-sandbox-${onlinePaidAmount}`,
    clientId: 'user-sandbox',
    status: 'pending_payment' as const,
    onlinePaidAmount,
    client,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Sandbox — 3 options de paiement Genius Pay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeniusInitiate.mockResolvedValue({
      checkoutUrl: 'https://sandbox.genius.ci/pay/checkout-test-xyz',
      reference: 'SANDBOX-REF-001',
    });
    mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-sandbox-1' });
  });

  // ── Option 1 : full_online ─────────────────────────────────────────────────
  describe('full_online (paiement 100 % en ligne)', () => {
    beforeEach(() => {
      // onlinePaidAmount = totalAmount car tout est payé en ligne
      mockPrisma.booking.findUnique.mockResolvedValue(makeBooking(TOTAL));
    });

    it('appelle Genius Pay avec le montant total (225 000 FCFA)', async () => {
      await paymentsService.initiate('user-sandbox', { bookingId: `bk-sandbox-${TOTAL}` } as never);
      expect(mockGeniusInitiate).toHaveBeenCalledTimes(1);
      expect(mockGeniusInitiate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: TOTAL }), // 225 000 FCFA
      );
    });

    it('passe les coordonnées client à Genius Pay', async () => {
      await paymentsService.initiate('user-sandbox', { bookingId: `bk-sandbox-${TOTAL}` } as never);
      expect(mockGeniusInitiate).toHaveBeenCalledWith(
        expect.objectContaining({
          customerEmail: client.email,
          customerPhone: client.phone,
          customerName: `${client.firstName} ${client.lastName}`,
        }),
      );
    });

    it('crée une transaction initiated avec le bon montant et la référence Genius Pay', async () => {
      await paymentsService.initiate('user-sandbox', { bookingId: `bk-sandbox-${TOTAL}` } as never);
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: TOTAL,
            status: 'initiated',
            geniusPayTransactionId: 'SANDBOX-REF-001',
            checkoutUrl: 'https://sandbox.genius.ci/pay/checkout-test-xyz',
          }),
        }),
      );
    });

    it('retourne checkoutUrl + transactionId', async () => {
      const result = await paymentsService.initiate('user-sandbox', { bookingId: `bk-sandbox-${TOTAL}` } as never);
      expect(result).toEqual({
        checkoutUrl: 'https://sandbox.genius.ci/pay/checkout-test-xyz',
        transactionId: 'tx-sandbox-1',
      });
    });
  });

  // ── Option 2 : ten_percent_online ─────────────────────────────────────────
  describe('ten_percent_online (10 % en ligne, 90 % espèces)', () => {
    // ceil(225 000 × 0.1) = 22 500 FCFA
    const DEPOSIT = Math.ceil(TOTAL * 0.1); // 22 500

    beforeEach(() => {
      mockPrisma.booking.findUnique.mockResolvedValue(makeBooking(DEPOSIT));
    });

    it('appelle Genius Pay avec 10 % du montant total (22 500 FCFA)', async () => {
      await paymentsService.initiate('user-sandbox', { bookingId: `bk-sandbox-${DEPOSIT}` } as never);
      expect(mockGeniusInitiate).toHaveBeenCalledTimes(1);
      expect(mockGeniusInitiate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: DEPOSIT }), // 22 500 FCFA
      );
    });

    it('le dépôt est exactement 10 % arrondi au centième supérieur', () => {
      expect(DEPOSIT).toBe(22_500);
      expect(DEPOSIT).toBe(Math.ceil(TOTAL * 0.1));
    });

    it('crée une transaction initiated avec le dépôt partiel', async () => {
      await paymentsService.initiate('user-sandbox', { bookingId: `bk-sandbox-${DEPOSIT}` } as never);
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: DEPOSIT,
            status: 'initiated',
          }),
        }),
      );
    });

    it('retourne une checkoutUrl valide pour le dépôt', async () => {
      const result = await paymentsService.initiate('user-sandbox', { bookingId: `bk-sandbox-${DEPOSIT}` } as never);
      expect(result.checkoutUrl).toContain('genius.ci');
      expect(result.transactionId).toBeTruthy();
    });
  });

  // ── Option 3 : zero_online ────────────────────────────────────────────────
  describe('zero_online (paiement 100 % espèces)', () => {
    beforeEach(() => {
      // La réservation zero_online est confirmée immédiatement lors de la création ;
      // son onlinePaidAmount est 0. Tenter d'initier un paiement Genius Pay est une erreur.
      mockPrisma.booking.findUnique.mockResolvedValue(makeBooking(0));
    });

    it('rejette avec 400 — aucun montant en ligne à régler', async () => {
      await expect(
        paymentsService.initiate('user-sandbox', { bookingId: 'bk-sandbox-0' } as never),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('ne contacte jamais Genius Pay pour une réservation cash', async () => {
      await paymentsService.initiate('user-sandbox', { bookingId: 'bk-sandbox-0' } as never).catch(() => {});
      expect(mockGeniusInitiate).not.toHaveBeenCalled();
    });
  });

  // ── Calculs montants attendus (documentation sandbox) ─────────────────────
  describe('Tableau de référence sandbox (75 000 FCFA/nuit × 3 nuits)', () => {
    it.each([
      ['full_online',        TOTAL,                  0                ],
      ['ten_percent_online', Math.ceil(TOTAL * 0.1), TOTAL - Math.ceil(TOTAL * 0.1)],
      ['zero_online',        0,                      TOTAL            ],
    ] as const)(
      '%s → en_ligne=%d  espèces=%d',
      (_option, online, cash) => {
        expect(online + cash).toBe(TOTAL);
        expect(online).toBeGreaterThanOrEqual(0);
        expect(cash).toBeGreaterThanOrEqual(0);
      },
    );
  });
});
