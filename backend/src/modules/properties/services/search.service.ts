// Property search — filters, geo-radius Haversine, visibility scoring sort
import { prisma } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';
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

export const searchService = {
  async search(params: SearchPropertiesInput): Promise<SearchResult> {
    if (params.lat !== undefined && params.lon !== undefined && params.radiusKm !== undefined) {
      return this.geoSearch(params);
    }
    return this.filterSearch(params);
  },

  async filterSearch(params: SearchPropertiesInput): Promise<SearchResult> {
    const { page, limit } = params;
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
      ...(params.city ? { city: { contains: params.city, mode: 'insensitive' } } : {}),
      ...(params.minRating ? { rating: { gte: new Prisma.Decimal(params.minRating) } } : {}),
      ...(params.paymentOption ? { paymentOptions: { has: params.paymentOption } } : {}),
      ...(params.minCapacity ? { capacity: { gte: params.minCapacity } } : {}),
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
        orderBy: [
          { isBoosted:     'desc' },   // boost payant/gratuit actif en premier
          { rating:        'desc' },
          { bookingsCount: 'desc' },
        ],
        include: {
          media:  { where: { isPrimary: true }, take: 1 },
          owner:  { select: { subscription: { select: { planType: true } } } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    // Tri secondaire en mémoire : score de visibilité composite
    // = visibilityBoostPct (0/30/100) + rating × 5 (max ~25)
    // Garantit qu'Entreprise (100) est prioritaire, Business (+30) bénéficie d'un
    // vrai avantage, et une note très élevée peut compenser une formule inférieure.
    const sorted = [...data].sort((a, b) => {
      const aAny = a as any;
      const bAny = b as any;
      if (aAny.isBoosted !== bAny.isBoosted) return aAny.isBoosted ? -1 : 1;
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

    // CTE avoids repeating the Haversine expression; sorted by visibility score then distance
    const geoRows = await prisma.$queryRaw<{ id: string; distance_km: number }[]>(Prisma.sql`
      WITH geo AS (
        SELECT
          id,
          is_boosted,
          rating,
          bookings_count,
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
      ORDER BY is_boosted DESC, distance_km ASC, rating DESC, bookings_count DESC
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
      ...(params.city ? { city: { contains: params.city, mode: 'insensitive' } } : {}),
      ...(params.minRating ? { rating: { gte: new Prisma.Decimal(params.minRating) } } : {}),
      ...(params.paymentOption ? { paymentOptions: { has: params.paymentOption } } : {}),
      ...(params.minCapacity ? { capacity: { gte: params.minCapacity } } : {}),
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
        media:  { where: { isPrimary: true }, take: 1 },
        owner:  { select: { subscription: { select: { planType: true } } } },
      },
    });

    // Tri géo : boost → score visibilité (visibilityBoostPct) → distance → rating
    filtered.sort((a, b) => {
      const aAny = a as any;
      const bAny = b as any;
      if (aAny.isBoosted !== bAny.isBoosted) return aAny.isBoosted ? -1 : 1;
      const visA = planVisibility(aAny.owner?.subscription?.planType ?? '');
      const visB = planVisibility(bAny.owner?.subscription?.planType ?? '');
      if (visA !== visB) return visB - visA;
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
