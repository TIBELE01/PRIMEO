import { num, normalizeProperty, normalizeProperties } from '../src/utils/normalizeProperty';

describe('num', () => {
  it('coerces a numeric string', () => {
    expect(num('4.5')).toBe(4.5);
  });

  it('passes through a number unchanged', () => {
    expect(num(3)).toBe(3);
  });

  it('falls back to 0 on null/undefined/NaN string', () => {
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
    expect(num('abc')).toBe(0);
  });

  it('uses a custom fallback when provided', () => {
    expect(num('abc', 1)).toBe(1);
  });
});

describe('normalizeProperty', () => {
  it('converts rating string to a number usable with toFixed', () => {
    const p = normalizeProperty({ id: '1', rating: '4.7', reviewCount: '12' });
    expect(typeof p.rating).toBe('number');
    expect(p.rating.toFixed(1)).toBe('4.7');
    expect(p.reviewCount).toBe(12);
  });

  it('defaults images and amenities to empty arrays when missing', () => {
    const p = normalizeProperty({ id: '1' });
    expect(Array.isArray(p.images)).toBe(true);
    expect(p.images).toHaveLength(0);
    expect(Array.isArray(p.amenities)).toBe(true);
    expect(p.amenities).toHaveLength(0);
    expect(p.images.find(() => true)).toBeUndefined(); // must not crash
  });

  it('parses pricePerNight string and preserves null prices', () => {
    const p = normalizeProperty({ id: '1', pricePerNight: '50000', priceForSale: null });
    expect(p.pricePerNight).toBe(50000);
    expect(p.priceForSale).toBeNull();
  });

  it('defaults owner.isSuperHost to false and coerces overallRating', () => {
    const p = normalizeProperty({ id: '1', owner: { firstName: 'A', overallRating: '4.9' } });
    expect(p.owner.isSuperHost).toBe(false);
    expect(num(p.owner.overallRating).toFixed(1)).toBe('4.9');
  });
});

describe('normalizeProperties', () => {
  it('filters out null/undefined entries', () => {
    const list = normalizeProperties([{ id: '1', rating: '4' }, null, undefined]);
    expect(list).toHaveLength(1);
    expect(list[0]!.rating).toBe(4);
  });
});
