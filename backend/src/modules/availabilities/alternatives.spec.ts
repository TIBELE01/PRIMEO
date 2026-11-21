jest.mock('../../database/prisma.service', () => ({ prisma: {} }));
import { pickAlternativeStays } from './availabilities.service';

describe('pickAlternativeStays — dates alternatives', () => {
  const blocked = new Set(['2027-03-10', '2027-03-11', '2027-03-12']);

  it('propose des séjours libres de même durée, au plus près de la date demandée', () => {
    const alts = pickAlternativeStays(blocked, '2027-03-10', 3, '2027-03-01', 60);
    expect(alts).toHaveLength(3);
    for (const a of alts) {
      for (const d of ['2027-03-10', '2027-03-11', '2027-03-12']) {
        expect(d >= a.checkIn && d < a.checkOut).toBe(false);
      }
    }
    expect(alts.map((a) => a.checkIn)).toEqual(['2027-03-07', '2027-03-13', '2027-03-16']);
  });

  it('ne propose jamais une date passée', () => {
    const alts = pickAlternativeStays(blocked, '2027-03-10', 2, '2027-03-09', 30);
    expect(alts.every((a) => a.checkIn >= '2027-03-09')).toBe(true);
    expect(alts[0]).toEqual({ checkIn: '2027-03-13', checkOut: '2027-03-15' });
  });

  it('renvoie une liste vide si tout est complet', () => {
    const all = new Set(Array.from({ length: 40 }, (_, i) => new Date(Date.UTC(2027, 2, 1 + i)).toISOString().slice(0, 10)));
    expect(pickAlternativeStays(all, '2027-03-10', 2, '2027-03-01', 5)).toEqual([]);
  });
});
