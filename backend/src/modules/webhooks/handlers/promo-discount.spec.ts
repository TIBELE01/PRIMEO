jest.mock('../../../config/env.config', () => ({ env: {} }));
jest.mock('../../../database/prisma.service', () => ({ prisma: {} }));
jest.mock('../../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

import { promoDiscountFor } from './genius-pay.handler';

// Inverse de pricing.service : remise = floor(base × % / 100), total = base − remise
const after = (base: number, p: number) => base - Math.floor((base * p) / 100);

describe('promoDiscountFor — remise affichée sur la facture', () => {
  it('aucun code promo → 0', () => {
    expect(promoDiscountFor(2500, null)).toBe(0);
  });

  it('90 % sur 25 000 FCFA → 22 500 FCFA', () => {
    expect(promoDiscountFor(2500, { discountType: 'percent', discountValue: 90 })).toBe(22500);
  });

  it.each([[25000, 90], [45000, 50], [70000, 15], [12500, 20]])('prix rond : remise exacte (base %i, %i %%)', (base, p) => {
    expect(promoDiscountFor(after(base, p), { discountType: 'percent', discountValue: p }))
      .toBe(Math.floor((base * p) / 100));
  });

  it.each([[33333, 15], [70001, 7], [19999, 33]])('prix quelconque : remise cohérente à 1 FCFA près (base %i, %i %%)', (base, p) => {
    const a = after(base, p);
    const r = promoDiscountFor(a, { discountType: 'percent', discountValue: p });
    expect(after(a + r, p)).toBe(a);
    expect(Math.abs(r - Math.floor((base * p) / 100))).toBeLessThanOrEqual(1);
  });

  it('montant fixe', () => {
    expect(promoDiscountFor(20000, { discountType: 'fixed_amount', discountValue: 5000 })).toBe(5000);
  });
});
