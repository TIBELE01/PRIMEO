// Tests unitaires — restitution du crédit portefeuille et du code promo d'une réservation

jest.mock('../../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockCredit = jest.fn(async () => 0);
jest.mock('../../wallets/wallets.service', () => ({
  walletService: { credit: (...a: unknown[]) => mockCredit(...(a as [])) },
}));

// État simulé d'une réservation en base
let row: { clientId: string; walletDeduction: number; promoCodeId: string | null } | null;

const mockTx = {
  booking: {
    findUnique: jest.fn(async () => (row ? { ...row } : null)),
    // Mise à jour conditionnelle : ne s'applique que si la valeur attendue est encore en base
    updateMany: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      if (!row) return { count: 0 };
      for (const key of ['walletDeduction', 'promoCodeId'] as const) {
        if (key in where && row[key] !== where[key]) return { count: 0 };
      }
      Object.assign(row, data);
      return { count: 1 };
    }),
  },
  promoCode: { updateMany: jest.fn(async () => ({ count: 1 })) },
};

const mockPrisma = {
  $transaction: jest.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
};
jest.mock('../../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { bookingCreditsService } from './booking-credits.service';

beforeEach(() => {
  jest.clearAllMocks();
  row = { clientId: 'c1', walletDeduction: 4000, promoCodeId: 'promo-1' };
});

describe('bookingCreditsService.release', () => {
  it('recrédite le portefeuille et rend l\'utilisation du code promo', async () => {
    const res = await bookingCreditsService.release('bk-1');

    expect(res).toEqual({ walletRefunded: 4000, promoReleased: true });
    expect(mockCredit).toHaveBeenCalledWith('c1', 4000, mockTx);
    expect(mockTx.promoCode.updateMany).toHaveBeenCalledWith({
      where: { id: 'promo-1', usesCount: { gt: 0 } }, // jamais de compteur négatif
      data: { usesCount: { decrement: 1 } },
    });
    expect(row).toMatchObject({ walletDeduction: 0, promoCodeId: null });
  });

  it('est idempotent : un second appel ne rend rien', async () => {
    await bookingCreditsService.release('bk-1');
    jest.clearAllMocks();

    const res = await bookingCreditsService.release('bk-1');

    expect(res).toEqual({ walletRefunded: 0, promoReleased: false });
    expect(mockCredit).not.toHaveBeenCalled();
    expect(mockTx.promoCode.updateMany).not.toHaveBeenCalled();
  });

  it('ne recrédite pas si un autre traitement a déjà restitué le montant entre-temps', async () => {
    // La lecture voit 4000, mais la mise à jour conditionnelle échoue (déjà à 0)
    mockTx.booking.findUnique.mockResolvedValueOnce({ clientId: 'c1', walletDeduction: 4000, promoCodeId: null });
    row = { clientId: 'c1', walletDeduction: 0, promoCodeId: null };

    const res = await bookingCreditsService.release('bk-1');

    expect(res.walletRefunded).toBe(0);
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('ne fait rien pour une réservation sans prélèvement', async () => {
    row = { clientId: 'c1', walletDeduction: 0, promoCodeId: null };
    const res = await bookingCreditsService.release('bk-1');
    expect(res).toEqual({ walletRefunded: 0, promoReleased: false });
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('ne fait rien pour une réservation introuvable', async () => {
    row = null;
    expect(await bookingCreditsService.release('ghost')).toEqual({ walletRefunded: 0, promoReleased: false });
  });

  it('réutilise la transaction fournie au lieu d\'en ouvrir une nouvelle', async () => {
    await bookingCreditsService.release('bk-1', mockTx as never);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockCredit).toHaveBeenCalledWith('c1', 4000, mockTx);
  });
});
