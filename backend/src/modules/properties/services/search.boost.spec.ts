// Classement des résultats de recherche : une annonce dont le boost est EN COURS passe
// devant les autres « toutes choses égales par ailleurs » ; un boost expiré (même si le
// drapeau n'a pas encore été remis à zéro par le cron) ne donne plus aucun avantage.
jest.mock('../../sectors/sectors.service', () => ({
  sectorsService: { getDisabledPropertyTypes: jest.fn(async () => []) },
}));
const mockPrisma: Record<string, any> = {
  property: { findMany: jest.fn(), count: jest.fn() },
  $queryRaw: jest.fn(),
};
jest.mock('../../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { searchService, isBoostActive } from './search.service';

const H = 3600_000;
const prop = (id: string, extra: Record<string, unknown> = {}) => ({
  id, rating: 4, bookingsCount: 0, isBoosted: false, boostExpiresAt: null,
  owner: { subscription: { planType: 'starter' } }, ...extra,
});

beforeEach(() => jest.clearAllMocks());

describe('isBoostActive', () => {
  it('actif seulement si drapeau + expiration future', () => {
    expect(isBoostActive({ isBoosted: true, boostExpiresAt: new Date(Date.now() + H) })).toBe(true);
    expect(isBoostActive({ isBoosted: true, boostExpiresAt: new Date(Date.now() - H) })).toBe(false);
    expect(isBoostActive({ isBoosted: true, boostExpiresAt: null })).toBe(false);
    expect(isBoostActive({ isBoosted: false, boostExpiresAt: new Date(Date.now() + H) })).toBe(false);
  });
});

describe('searchService.filterSearch — priorité des annonces boostées', () => {
  it('annonce boostée en tête, à critères identiques', async () => {
    mockPrisma.property.findMany.mockResolvedValue([prop('A'), prop('B'), prop('C', { isBoosted: true, boostExpiresAt: new Date(Date.now() + 48 * H) })]);
    mockPrisma.property.count.mockResolvedValue(3);
    const res = await searchService.filterSearch({ page: 1, limit: 20 } as never);
    expect((res.data as any[]).map((p) => p.id)).toEqual(['C', 'A', 'B']);
    // L'ordre en base place aussi les boostés en premier (pagination cohérente)
    expect(mockPrisma.property.findMany.mock.calls[0][0].orderBy[0]).toEqual({ isBoosted: 'desc' });
  });

  it('le boost passe devant une meilleure note et une meilleure formule', async () => {
    mockPrisma.property.findMany.mockResolvedValue([
      prop('TOP', { rating: 5, owner: { subscription: { planType: 'entreprise' } } }),
      prop('BOOST', { rating: 3, isBoosted: true, boostExpiresAt: new Date(Date.now() + H) }),
    ]);
    mockPrisma.property.count.mockResolvedValue(2);
    const res = await searchService.filterSearch({ page: 1, limit: 20 } as never);
    expect((res.data as any[])[0].id).toBe('BOOST');
  });

  it('boost expiré (drapeau pas encore nettoyé) → classement normal', async () => {
    mockPrisma.property.findMany.mockResolvedValue([
      prop('EXPIRED', { rating: 3, isBoosted: true, boostExpiresAt: new Date(Date.now() - H) }),
      prop('GOOD', { rating: 5 }),
    ]);
    mockPrisma.property.count.mockResolvedValue(2);
    const res = await searchService.filterSearch({ page: 1, limit: 20 } as never);
    expect((res.data as any[]).map((p) => p.id)).toEqual(['GOOD', 'EXPIRED']);
  });
});

describe('searchService.geoSearch — requête SQL', () => {
  it('utilise les vrais noms de colonnes et le boost en cours', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    await searchService.geoSearch({ lat: 5.35, lon: -4, radiusKm: 10, page: 1, limit: 20 } as never);
    const sql = mockPrisma.$queryRaw.mock.calls[0][0].strings.join('?');
    expect(sql).toContain('"isBoosted" AND "boostExpiresAt" > NOW()');
    expect(sql).toContain('"bookingsCount"');
    expect(sql).not.toMatch(/\bis_boosted\b/);
  });
});

describe('searchService.filterSearch — tris demandés par l\'app', () => {
  const list = () => [
    prop('CHER',  { pricePerNight: 90000, rating: 3, bookingsCount: 1, createdAt: new Date('2026-01-01') }),
    prop('PASCHER', { pricePerNight: 20000, rating: 4, bookingsCount: 9, createdAt: new Date('2026-03-01') }),
    prop('MOYEN', { pricePerNight: 50000, rating: 5, bookingsCount: 4, createdAt: new Date('2026-11-01') }),
    prop('VENTE', { pricePerNight: null, priceSale: 30000000, rating: 2 }),
  ];
  const ids = async (sortBy: string) => {
    mockPrisma.property.findMany.mockResolvedValue(list()); mockPrisma.property.count.mockResolvedValue(4);
    return ((await searchService.filterSearch({ page: 1, limit: 20, sortBy } as never)).data as any[]).map((p) => p.id);
  };
  it('prix croissant', async () => expect(await ids('price_asc')).toEqual(['PASCHER', 'MOYEN', 'CHER', 'VENTE']));
  it('prix décroissant', async () => expect(await ids('price_desc')).toEqual(['VENTE', 'CHER', 'MOYEN', 'PASCHER']));
  it('mieux notés', async () => expect(await ids('rating')).toEqual(['MOYEN', 'PASCHER', 'CHER', 'VENTE']));
  it('popularité (réservations)', async () => expect((await ids('popular'))[0]).toBe('PASCHER'));
  it('nouveautés', async () => expect((await ids('newest'))[0]).toBe('MOYEN'));
  it('l\'ordre en base suit le tri (pagination cohérente)', async () => {
    await ids('price_asc');
    const ob = mockPrisma.property.findMany.mock.calls.at(-1)[0].orderBy;
    expect(ob[0]).toEqual({ isBoosted: 'desc' });
    expect(ob[1]).toEqual({ pricePerNight: { sort: 'asc', nulls: 'last' } });
  });
  it('une annonce boostée reste en tête même en tri par prix', async () => {
    mockPrisma.property.findMany.mockResolvedValue([...list(), prop('BOOST', { pricePerNight: 99999, isBoosted: true, boostExpiresAt: new Date(Date.now() + H) })]);
    mockPrisma.property.count.mockResolvedValue(5);
    const r = await searchService.filterSearch({ page: 1, limit: 20, sortBy: 'price_asc' } as never);
    expect((r.data as any[])[0].id).toBe('BOOST');
  });
});
