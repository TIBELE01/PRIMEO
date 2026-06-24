import { cn, initials, formatAmount, formatPercent, truncate, slugify } from '../utils';

describe('cn (fusion de classes Tailwind)', () => {
  it('fusionne et dédoublonne les classes conflictuelles', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
  it('ignore les valeurs falsy', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });
});

describe('initials', () => {
  it('renvoie les 2 premières initiales en majuscules', () => {
    expect(initials('Jean Dupont')).toBe('JD');
  });
  it('gère un seul mot', () => {
    expect(initials('Awa')).toBe('A');
  });
});

describe('formatAmount', () => {
  it('formate avec séparateurs et devise XOF par défaut', () => {
    expect(formatAmount(24000)).toBe('24 000 XOF');
  });
});

describe('formatPercent / truncate / slugify', () => {
  it('formatPercent', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
  });
  it('truncate', () => {
    expect(truncate('abcdef', 3)).toBe('abc...');
    expect(truncate('abc', 5)).toBe('abc');
  });
  it('slugify', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Codes Promo 2026!')).toBe('codes-promo-2026');
  });
});
