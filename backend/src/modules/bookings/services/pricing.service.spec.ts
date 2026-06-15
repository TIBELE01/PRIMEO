// Unit tests for pricingService.compute
import { pricingService } from './pricing.service';

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../database/prisma.service', () => ({
  prisma: {
    property:     { findUnique: jest.fn() },
    promoCode:    { findUnique: jest.fn() },
    availability: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../database/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as unknown as Record<string, Record<string, jest.Mock>>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const now = new Date();
const start = new Date(now.getTime() + 24 * 3600_000);
const end   = new Date(start.getTime() + 3 * 24 * 3600_000); // 3 nights

function makeProperty(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prop-1',
    status: 'active',
    propertyType: 'hebergement',
    pricePerNight: 75_000,
    pricePerMonth: null,
    priceSale: null,
    paymentOptions: [],
    capacity: 4,
    owner: { subscription: { planType: 'starter', commissionRate: null } },
    ...overrides,
  };
}

const baseParams = {
  propertyId: 'prop-1',
  startDate: start,
  endDate: end,
  paymentOption: 'full_online' as const,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('pricingService.compute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.property!.findUnique.mockResolvedValue(makeProperty());
    db.promoCode!.findUnique.mockResolvedValue(null);
    db.availability!.findMany.mockResolvedValue([]); // aucun tarif saisonnier par défaut
  });

  // ── Error cases ─────────────────────────────────────────────────────────────

  it('throws 404 when property not found', async () => {
    db.property!.findUnique.mockResolvedValueOnce(null);
    await expect(pricingService.compute(baseParams)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 when property is not active', async () => {
    db.property!.findUnique.mockResolvedValueOnce(makeProperty({ status: 'inactive' }));
    await expect(pricingService.compute(baseParams)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when payment option is not allowed', async () => {
    db.property!.findUnique.mockResolvedValueOnce(
      makeProperty({ paymentOptions: ['zero_online'] }),
    );
    await expect(pricingService.compute({ ...baseParams, paymentOption: 'full_online' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when endDate <= startDate (0 nights)', async () => {
    await expect(pricingService.compute({ ...baseParams, endDate: start }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when property has no price defined', async () => {
    db.property!.findUnique.mockResolvedValueOnce(
      makeProperty({ pricePerNight: null, pricePerMonth: null, priceSale: null }),
    );
    await expect(pricingService.compute(baseParams)).rejects.toMatchObject({ statusCode: 400 });
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  it('computes 3-night stay at 75000/night correctly', async () => {
    const result = await pricingService.compute(baseParams);
    expect(result.nights).toBe(3);
    expect(result.pricePerUnit).toBe(75_000);
    expect(result.basePrice).toBe(225_000);
    expect(result.promoDiscount).toBe(0);
    expect(result.walletDeduction).toBe(0);
    expect(result.totalAmount).toBe(225_000);
  });

  it('full_online — onlinePaidAmount equals total', async () => {
    const result = await pricingService.compute({ ...baseParams, paymentOption: 'full_online' });
    expect(result.onlinePaidAmount).toBe(result.totalAmount);
    expect(result.remainingCashAmount).toBe(0);
  });

  it('ten_percent_online — online is 10% of total (rounded up)', async () => {
    const result = await pricingService.compute({ ...baseParams, paymentOption: 'ten_percent_online' });
    expect(result.onlinePaidAmount).toBe(Math.ceil(225_000 * 0.1));
    expect(result.remainingCashAmount).toBe(225_000 - result.onlinePaidAmount);
  });

  it('zero_online — onlinePaidAmount is 0', async () => {
    const result = await pricingService.compute({ ...baseParams, paymentOption: 'zero_online' });
    expect(result.onlinePaidAmount).toBe(0);
    expect(result.remainingCashAmount).toBe(225_000);
  });

  // ── Commission ───────────────────────────────────────────────────────────────

  it('commission 0% pour le plan Starter', async () => {
    const result = await pricingService.compute(baseParams);
    expect(result.commissionAmount).toBe(0);
  });

  it('commission 0% pour le plan Business', async () => {
    db.property!.findUnique.mockResolvedValueOnce(
      makeProperty({ owner: { subscription: { planType: 'business', commissionRate: null } } }),
    );
    const result = await pricingService.compute(baseParams);
    expect(result.commissionAmount).toBe(0);
  });

  it('commission 0% pour le plan Entreprise', async () => {
    db.property!.findUnique.mockResolvedValueOnce(
      makeProperty({ owner: { subscription: { planType: 'entreprise', commissionRate: null } } }),
    );
    const result = await pricingService.compute(baseParams);
    expect(result.commissionAmount).toBe(0);
  });

  it('commission 0% par défaut sans abonnement', async () => {
    db.property!.findUnique.mockResolvedValueOnce(makeProperty({ owner: null }));
    const result = await pricingService.compute(baseParams);
    expect(result.commissionAmount).toBe(0);
  });

  // ── Wallet deduction ─────────────────────────────────────────────────────────

  it('deducts wallet credit from total', async () => {
    const result = await pricingService.compute({ ...baseParams, walletCredit: 10_000 });
    expect(result.walletDeduction).toBe(10_000);
    expect(result.totalAmount).toBe(215_000);
  });

  it('caps wallet deduction at the remaining amount', async () => {
    const result = await pricingService.compute({ ...baseParams, walletCredit: 999_999 });
    expect(result.walletDeduction).toBe(225_000); // capped at basePrice
    expect(result.totalAmount).toBe(0);
  });

  // ── Promo codes ──────────────────────────────────────────────────────────────

  it('throws 400 for invalid promo code', async () => {
    db.promoCode!.findUnique.mockResolvedValueOnce({ isActive: false });
    await expect(pricingService.compute({ ...baseParams, promoCode: 'BAD' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 for expired promo code', async () => {
    db.promoCode!.findUnique.mockResolvedValueOnce({
      isActive: true,
      validFrom: new Date(Date.now() - 10 * 3600_000),
      validUntil: new Date(Date.now() - 1 * 3600_000), // expired 1h ago
      maxUses: null,
      usesCount: 0,
      minAmount: null,
      discountType: 'percent',
      discountValue: 10,
      id: 'promo-1',
    });
    await expect(pricingService.compute({ ...baseParams, promoCode: 'EXP' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('applies percent discount correctly', async () => {
    db.promoCode!.findUnique.mockResolvedValueOnce({
      isActive: true,
      validFrom: new Date(Date.now() - 3600_000),
      validUntil: new Date(Date.now() + 3600_000),
      maxUses: null,
      usesCount: 0,
      minAmount: null,
      discountType: 'percent',
      discountValue: 10,
      id: 'promo-1',
    });
    const result = await pricingService.compute({ ...baseParams, promoCode: 'TEN' });
    expect(result.promoDiscount).toBe(Math.floor(225_000 * 0.1));
    expect(result.totalAmount).toBe(225_000 - result.promoDiscount);
  });

  it('applies fixed discount correctly', async () => {
    db.promoCode!.findUnique.mockResolvedValueOnce({
      isActive: true,
      validFrom: new Date(Date.now() - 3600_000),
      validUntil: new Date(Date.now() + 3600_000),
      maxUses: null,
      usesCount: 0,
      minAmount: null,
      discountType: 'fixed',
      discountValue: 20_000,
      id: 'promo-2',
    });
    const result = await pricingService.compute({ ...baseParams, promoCode: 'FLAT' });
    expect(result.promoDiscount).toBe(20_000);
    expect(result.totalAmount).toBe(205_000);
  });

  it('throws 400 when minimum amount not met', async () => {
    db.promoCode!.findUnique.mockResolvedValueOnce({
      isActive: true,
      validFrom: new Date(Date.now() - 3600_000),
      validUntil: new Date(Date.now() + 3600_000),
      maxUses: null,
      usesCount: 0,
      minAmount: 500_000, // more than our 225000 base
      discountType: 'percent',
      discountValue: 10,
      id: 'promo-3',
    });
    await expect(pricingService.compute({ ...baseParams, promoCode: 'MIN' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when promo usage limit reached', async () => {
    db.promoCode!.findUnique.mockResolvedValueOnce({
      isActive: true,
      validFrom: new Date(Date.now() - 3600_000),
      validUntil: new Date(Date.now() + 3600_000),
      maxUses: 5,
      usesCount: 5, // exhausted
      minAmount: null,
      discountType: 'percent',
      discountValue: 10,
      id: 'promo-4',
    });
    await expect(pricingService.compute({ ...baseParams, promoCode: 'MAX' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  // ── Tarifs saisonniers (Availability.priceOverride) ───────────────────────────
  // Scénario : prix de base 1000 F/nuit, période saisonnière du 15 au 20 juin à 2000 F.
  describe('tarifs saisonniers', () => {
    const NIGHTLY = 1000;
    const SEASON = 2000;

    // Helpers : dates UTC à minuit (comme une réservation parsée depuis 'YYYY-MM-DD')
    const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

    function seasonProperty() {
      return makeProperty({ pricePerNight: NIGHTLY });
    }

    beforeEach(() => {
      db.property!.findUnique.mockResolvedValue(seasonProperty());
    });

    it('utilise le tarif saisonnier (2000 F) pour une réservation dans la période', async () => {
      // Séjour 16 → 19 juin = 3 nuits (16, 17, 18), toutes en saison à 2000 F
      db.availability!.findMany.mockResolvedValue([
        { date: day('2026-06-16'), priceOverride: SEASON },
        { date: day('2026-06-17'), priceOverride: SEASON },
        { date: day('2026-06-18'), priceOverride: SEASON },
      ]);

      const result = await pricingService.compute({
        ...baseParams,
        startDate: day('2026-06-16'),
        endDate: day('2026-06-19'),
      });

      expect(result.nights).toBe(3);
      expect(result.basePrice).toBe(3 * SEASON); // 6000 F, et non 3 × 1000
      expect(result.totalAmount).toBe(3 * SEASON);
    });

    it('utilise le prix de base (1000 F) hors période saisonnière', async () => {
      // Séjour 1 → 4 juin = 3 nuits, aucune surcharge en base
      db.availability!.findMany.mockResolvedValue([]);

      const result = await pricingService.compute({
        ...baseParams,
        startDate: day('2026-06-01'),
        endDate: day('2026-06-04'),
      });

      expect(result.nights).toBe(3);
      expect(result.basePrice).toBe(3 * NIGHTLY); // 3000 F
    });

    it('mélange tarif saisonnier et tarif de base au sein d\'un même séjour', async () => {
      // Séjour 14 → 17 juin = 3 nuits : 14 (base 1000) + 15, 16 (saison 2000)
      db.availability!.findMany.mockResolvedValue([
        { date: day('2026-06-15'), priceOverride: SEASON },
        { date: day('2026-06-16'), priceOverride: SEASON },
        // le 14 n'a pas de priceOverride → tarif de base
      ]);

      const result = await pricingService.compute({
        ...baseParams,
        startDate: day('2026-06-14'),
        endDate: day('2026-06-17'),
      });

      expect(result.nights).toBe(3);
      expect(result.basePrice).toBe(NIGHTLY + SEASON + SEASON); // 1000 + 2000 + 2000 = 5000
    });

    it('ignore une priceOverride nulle (jour disponible sans surcharge)', async () => {
      db.availability!.findMany.mockResolvedValue([
        { date: day('2026-06-16'), priceOverride: null },
        { date: day('2026-06-17'), priceOverride: SEASON },
        { date: day('2026-06-18'), priceOverride: null },
      ]);

      const result = await pricingService.compute({
        ...baseParams,
        startDate: day('2026-06-16'),
        endDate: day('2026-06-19'),
      });

      // 16 (base) + 17 (saison) + 18 (base) = 1000 + 2000 + 1000 = 4000
      expect(result.basePrice).toBe(NIGHTLY + SEASON + NIGHTLY);
    });

    it('interroge la disponibilité pour chaque nuit du séjour (borne départ exclue)', async () => {
      db.availability!.findMany.mockResolvedValue([]);
      await pricingService.compute({
        ...baseParams,
        startDate: day('2026-06-16'),
        endDate: day('2026-06-19'),
      });
      const call = db.availability!.findMany.mock.calls[0]![0];
      expect(call.where.propertyId).toBe('prop-1');
      // 3 nuits demandées : 16, 17, 18 (pas le 19 = jour de départ)
      expect(call.where.date.in).toHaveLength(3);
    });
  });
});
