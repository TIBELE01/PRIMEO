// Property search — filters, geo-radius Haversine, visibility scoring sort
import { prisma } from '../../../database/prisma.service';
import { Prisma, PropertyType } from '@prisma/client';
import { sectorsService } from '../../sectors/sectors.service';
import type { SearchPropertiesInput } from '../dto/property.dto';
import { getPlanDetails } from '../../../common/constants/subscription-plans';

// Construit le filtre Prisma pour propertyType (un seul ou plusieurs séparés par virgule)
function buildTypeFilter(propertyType?: string): Prisma.PropertyWhereInput {
  if (!propertyType) return {};
  const types = propertyType.split(',').map(t => t.trim()).filter(Boolean) as any[];
  if (types.length === 0) return {};
  if (types.length === 1) return { propertyType: types[0] };
  return { propertyType: { in: types } };
}

type SearchResult = {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

// Score de visibilité basé sur le plan (0/30/100) — utilisé dans les deux méthodes de tri.
const planVisibility = (plan: string): number =>
  (getPlanDetails(plan) ?? getPlanDetails('starter')).visibilityBoostPct;

// Secteurs désactivés par l'admin : leurs annonces n'apparaissent dans aucune
// recherche. Exprimé avec AND pour se combiner au filtre de type demandé.
async function buildHiddenTypesFilter(): Promise<Prisma.PropertyWhereInput> {
  const hidden = await sectorsService.getDisabledPropertyTypes();
  if (hidden.length === 0) return {};
  return { AND: [{ propertyType: { notIn: hidden as PropertyType[] } }] };
}

// Boost réellement en cours : drapeau actif ET date d'expiration future. Entre deux
// passages du cron d'expiration, une annonce dont le boost vient d'expirer ne doit
// plus être remontée en tête.
export function isBoostActive(p: { isBoosted?: boolean | null; boostExpiresAt?: Date | string | null }, now = Date.now()): boolean {
  if (!p.isBoosted) return false;
  if (!p.boostExpiresAt) return false;
  return new Date(p.boostExpiresAt).getTime() > now;
}

type SortKey = NonNullable<SearchPropertiesInput['sortBy']>;
type SortableProperty = {
  id?: string; rating?: unknown; bookingsCount?: number | null; createdAt?: Date | string | null;
  pricePerNight?: number | null; pricePerMonth?: number | null; priceSale?: number | null;
};

/** Prix de référence d'une annonce (nuitée, sinon loyer mensuel, sinon prix de vente). */
function refPrice(p: SortableProperty): number | null {
  return p.pricePerNight ?? p.pricePerMonth ?? p.priceSale ?? null;
}

/** Comparateur du tri explicite (hors boost, appliqué ensuite). null = tri par défaut. */
function explicitComparator(sort: SortKey | undefined): ((a: SortableProperty, b: SortableProperty) => number) | null {
  switch (sort) {
    case 'price_asc':
    case 'price_desc': {
      const dir = sort === 'price_asc' ? 1 : -1;
      return (a, b) => {
        const pa = refPrice(a); const pb = refPrice(b);
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;   // sans prix : en fin de liste
        if (pb === null) return -1;
        return (pa - pb) * dir;
      };
    }
    case 'rating':
      return (a, b) => (Number(b.rating ?? 0) - Number(a.rating ?? 0)) || ((b.bookingsCount ?? 0) - (a.bookingsCount ?? 0));
    case 'newest':
      return (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    case 'popular':
      return (a, b) => ((b.bookingsCount ?? 0) - (a.bookingsCount ?? 0)) || (Number(b.rating ?? 0) - Number(a.rating ?? 0));
    default:
      return null;
  }
}

/** Ordre Prisma correspondant (pagination cohérente avec le tri affiché). */
function prismaOrder(sort: SortKey | undefined): Prisma.PropertyOrderByWithRelationInput[] {
  const boost: Prisma.PropertyOrderByWithRelationInput = { isBoosted: 'desc' };
  switch (sort) {
    case 'price_asc':
    case 'price_desc': {
      const d = sort === 'price_asc' ? 'asc' : 'desc';
      return [boost, { pricePerNight: { sort: d, nulls: 'last' } }, { pricePerMonth: { sort: d, nulls: 'last' } }, { priceSale: { sort: d, nulls: 'last' } }];
    }
    case 'newest':  return [boost, { createdAt: 'desc' }];
    case 'popular': return [boost, { bookingsCount: 'desc' }, { rating: 'desc' }];
    default:        return [boost, { rating: 'desc' }, { bookingsCount: 'desc' }];
  }
}

/** Lieu saisi par l'utilisateur (ville, quartier, commune…) : cherché dans la ville, la rue
 *  (quartier/adresse) et le titre — « Cocody » trouve les annonces d'Abidjan situées à Cocody. */
function locationFilter(city?: string): Prisma.PropertyWhereInput {
  const q = city?.trim();
  if (!q) return {};
  return {
    AND: [{
      OR: [
        { city: { contains: q, mode: 'insensitive' } },
        { street: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
      ],
    }],
  };
}

/** Capacité minimale : les annonces sans capacité renseignée restent visibles. */
function capacityFilter(min?: number): Prisma.PropertyWhereInput {
  if (!min) return {};
  return { AND: [{ OR: [{ capacity: { gte: min } }, { capacity: null }] }] };
}

/** Fusionne plusieurs filtres contenant chacun un tableau AND. */
function mergeAnd(...filters: Prisma.PropertyWhereInput[]): Prisma.PropertyWhereInput {
  const and = filters.flatMap((f) => (Array.isArray(f.AND) ? f.AND : f.AND ? [f.AND] : []));
  return and.length ? { AND: and } : {};
}

export const searchService = {
  async search(params: SearchPropertiesInput): Promise<SearchResult> {
    if (params.lat !== undefined && params.lon !== undefined && params.radiusKm !== undefined) {
      return this.geoSearch(params);
    }
    return this.filterSearch(params);
  },

  async filterSearch(params: SearchPropertiesInput): Promise<SearchResult> {
    const { page, limit } = params;
    const hiddenTypesFilter = await buildHiddenTypesFilter();
    const amenities = params.amenities
      ?.split(',')
      .map((a) => a.trim())
      .filter(Boolean) ?? [];

    const where: Prisma.PropertyWhereInput = {
      status: 'active',
      ...(params.q
        ? {
            OR: [
              { title: { contains: params.q, mode: 'insensitive' } },
              { description: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...buildTypeFilter(params.propertyType),
      ...mergeAnd(hiddenTypesFilter, locationFilter(params.city), capacityFilter(params.minCapacity)),
      ...(params.minRating ? { rating: { gte: new Prisma.Decimal(params.minRating) } } : {}),
      ...(params.paymentOption ? { paymentOptions: { has: params.paymentOption } } : {}),
      ...(amenities.length > 0 ? { amenities: { hasEvery: amenities } } : {}),
      ...(params.minPrice !== undefined || params.maxPrice !== undefined
        ? {
            OR: [
              {
                pricePerNight: {
                  ...(params.minPrice ? { gte: params.minPrice } : {}),
                  ...(params.maxPrice ? { lte: params.maxPrice } : {}),
                },
              },
              {
                pricePerMonth: {
                  ...(params.minPrice ? { gte: params.minPrice } : {}),
                  ...(params.maxPrice ? { lte: params.maxPrice } : {}),
                },
              },
              {
                priceSale: {
                  ...(params.minPrice ? { gte: params.minPrice } : {}),
                  ...(params.maxPrice ? { lte: params.maxPrice } : {}),
                },
              },
            ],
          }
        : {}),
      ...(params.checkIn && params.checkOut
        ? {
            NOT: {
              bookings: {
                some: {
                  status: { in: ['confirmed', 'pending_payment'] },
                  startDate: { lt: new Date(params.checkOut) },
                  endDate: { gt: new Date(params.checkIn) },
                },
              },
            },
          }
        : {}),
    };

    // Ordre de visibilité : boost actif → plan Entreprise → plan Business → rating
    const [data, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: prismaOrder(params.sortBy), // boost actif en premier, puis le tri demandé
        include: {
          media:  { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 }, // photo principale, sinon vidéo (poster)
          // Biens « visite 3D » sans photo : 1re scène servant de couverture (URL seule)
          scenes3d: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          owner:  { select: { subscription: { select: { planType: true } } } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    // Tri secondaire en mémoire : score de visibilité composite
    // = visibilityBoostPct (0/30/100) + rating × 5 (max ~25)
    // Garantit qu'Entreprise (100) est prioritaire, Business (+30) bénéficie d'un
    // vrai avantage, et une note très élevée peut compenser une formule inférieure.
    const now = Date.now();
    const sorted = [...data].sort((a, b) => {
      const aAny = a as any;
      const bAny = b as any;
      const boostA = isBoostActive(aAny, now);
      const boostB = isBoostActive(bAny, now);
      if (boostA !== boostB) return boostA ? -1 : 1;
      const cmp = explicitComparator(params.sortBy);
      if (cmp) return cmp(aAny, bAny);
      const scoreA = planVisibility(aAny.owner?.subscription?.planType ?? '') + Number(aAny.rating ?? 0) * 5;
      const scoreB = planVisibility(bAny.owner?.subscription?.planType ?? '') + Number(bAny.rating ?? 0) * 5;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return Number(bAny.bookingsCount ?? 0) - Number(aAny.bookingsCount ?? 0);
    });

    const withBadge = sorted.map((p) => {
      const planType = (p as any).owner?.subscription?.planType ?? '';
      return {
        ...p,
        badgeType: planType === 'entreprise' ? 'premium' : planType === 'business' ? 'verified' : null,
      };
    });
    return { data: withBadge, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async geoSearch(params: SearchPropertiesInput): Promise<SearchResult> {
    const { lat, lon, radiusKm, page, limit } = params;
    const hiddenTypesFilter = await buildHiddenTypesFilter();

    // CTE avoids repeating the Haversine expression; sorted by visibility score then distance
    const geoRows = await prisma.$queryRaw<{ id: string; distance_km: number }[]>(Prisma.sql`
      WITH geo AS (
        SELECT
          id,
          ("isBoosted" AND "boostExpiresAt" > NOW()) AS boosted,
          rating,
          "bookingsCount" AS bookings_count,
          (6371 * acos(
            LEAST(1.0,
              cos(radians(${lat!})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(${lon!})) +
              sin(radians(${lat!})) * sin(radians(latitude))
            )
          )) AS distance_km
        FROM properties
        WHERE status = 'active'
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
      )
      SELECT id, distance_km
      FROM geo
      WHERE distance_km <= ${radiusKm!}
      ORDER BY boosted DESC, distance_km ASC, rating DESC NULLS LAST, bookings_count DESC
    `);

    if (geoRows.length === 0) return { data: [], total: 0, page, limit, pages: 0 };

    const allIds = geoRows.map((r) => r.id);
    const geoDistanceMap = new Map(geoRows.map((r) => [r.id, r.distance_km]));

    const amenities = params.amenities
      ?.split(',')
      .map((a) => a.trim())
      .filter(Boolean) ?? [];

    const where: Prisma.PropertyWhereInput = {
      id: { in: allIds },
      ...buildTypeFilter(params.propertyType),
      ...mergeAnd(hiddenTypesFilter, locationFilter(params.city), capacityFilter(params.minCapacity)),
      ...(params.minRating ? { rating: { gte: new Prisma.Decimal(params.minRating) } } : {}),
      ...(params.paymentOption ? { paymentOptions: { has: params.paymentOption } } : {}),
      ...(amenities.length > 0 ? { amenities: { hasEvery: amenities } } : {}),
      ...(params.checkIn && params.checkOut
        ? {
            NOT: {
              bookings: {
                some: {
                  status: { in: ['confirmed', 'pending_payment'] },
                  startDate: { lt: new Date(params.checkOut!) },
                  endDate: { gt: new Date(params.checkIn!) },
                },
              },
            },
          }
        : {}),
    };

    const filtered = await prisma.property.findMany({
      where,
      include: {
        media:  { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 }, // photo principale, sinon vidéo (poster)
        scenes3d: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
        owner:  { select: { subscription: { select: { planType: true } } } },
      },
    });

    // Tri géo : boost → score visibilité (visibilityBoostPct) → distance → rating
    const now = Date.now();
    filtered.sort((a, b) => {
      const aAny = a as any;
      const bAny = b as any;
      const boostA = isBoostActive(aAny, now);
      const boostB = isBoostActive(bAny, now);
      if (boostA !== boostB) return boostA ? -1 : 1;
      // Recherche autour d'une position : distance par défaut, sinon le tri demandé
      const cmp = params.sortBy && params.sortBy !== 'distance' && params.sortBy !== 'relevance' ? explicitComparator(params.sortBy) : null;
      if (cmp) return cmp(aAny, bAny);
      // Tri « distance » explicite : la plus proche d'abord (après les annonces boostées)
      if (params.sortBy !== 'distance') {
        const visA = planVisibility(aAny.owner?.subscription?.planType ?? '');
        const visB = planVisibility(bAny.owner?.subscription?.planType ?? '');
        if (visA !== visB) return visB - visA;
      }
      const dA = geoDistanceMap.get(aAny.id) ?? Infinity;
      const dB = geoDistanceMap.get(bAny.id) ?? Infinity;
      if (Math.abs(dA - dB) > 0.01) return dA - dB;
      return Number(bAny.rating) - Number(aAny.rating);
    });

    const filteredTotal = filtered.length;
    const data = filtered.slice((page - 1) * limit, page * limit);
    const withBadge = data.map((p) => {
      const planType = (p as any).owner?.subscription?.planType ?? '';
      return {
        ...p,
        badgeType: planType === 'entreprise' ? 'premium' : planType === 'business' ? 'verified' : null,
      };
    });
    return { data: withBadge, total: filteredTotal, page, limit, pages: Math.ceil(filteredTotal / limit) };
  },
};
