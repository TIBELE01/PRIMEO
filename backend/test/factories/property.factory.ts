// Factory propriétés — données cohérentes pour les tests
import type { PrismaClient, Property } from '@prisma/client';
import { Prisma, PropertyType, PropertyStatus, PaymentOption } from '@prisma/client';

let _seq = 1;
function seq(): number {
  return _seq++;
}

// Quartiers ivoiriens avec coordonnées GPS réelles
const IVORIAN_LOCATIONS = [
  { city: 'Abidjan', street: 'Rue des Jardins, Cocody Riviera 2', latitude: 5.3864, longitude: -3.9543 },
  { city: 'Abidjan', street: 'Avenue du Général de Gaulle, Le Plateau', latitude: 5.3236, longitude: -4.0167 },
  { city: 'Abidjan', street: 'Rue du Commerce, Marcory', latitude: 5.2988, longitude: -3.9908 },
  { city: 'Abidjan', street: 'Boulevard Latrille, Cocody', latitude: 5.3764, longitude: -3.9773 },
  { city: 'Abidjan', street: 'Rue des Bâtisseurs, Yopougon', latitude: 5.3572, longitude: -4.0723 },
  { city: 'Grand-Bassam', street: 'Boulevard de la Corniche', latitude: 5.2101, longitude: -3.7385 },
] as const;

// ─── Build factory (pas de DB) ────────────────────────────────────────────────

type BuildPropertyInput = Partial<Omit<Property, 'id' | 'createdAt' | 'updatedAt'>>;

export function buildProperty(overrides: BuildPropertyInput = {}): Omit<Property, 'id' | 'createdAt' | 'updatedAt'> {
  const n = seq();
  const location = IVORIAN_LOCATIONS[n % IVORIAN_LOCATIONS.length];

  return {
    ownerId: `owner-id-${n}`,
    propertyType: PropertyType.residence,
    title: `Propriété Test ${n}`,
    description: 'Description de propriété pour les tests automatisés.',
    rooms: 3,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    surface: null,
    capacity: 4,
    pricePerNight: 50000,
    pricePerMonth: null,
    priceSale: null,
    cuisineType: null,
    openingHours: null,
    street: location.street,
    city: location.city,
    latitude: location.latitude,
    longitude: location.longitude,
    status: PropertyStatus.active,
    isBoosted: false,
    boostExpiresAt: null,
    viewsCount: 0,
    bookingsCount: 0,
    rating: new Prisma.Decimal(0),
    reviewCount: 0,
    amenities: ['wifi', 'climatisation', 'parking'],
    paymentOptions: [PaymentOption.full_online, PaymentOption.ten_percent_online],
    rules: null,
    hasVirtualTour: false,
    ...overrides,
  };
}

export function buildResidence(overrides: BuildPropertyInput = {}) {
  return buildProperty({
    propertyType: PropertyType.residence,
    pricePerNight: 60000,
    amenities: ['wifi', 'climatisation', 'piscine', 'parking'],
    ...overrides,
  });
}

export function buildHotel(overrides: BuildPropertyInput = {}) {
  return buildProperty({
    propertyType: PropertyType.hotel,
    rooms: 30,
    bedrooms: 30,
    beds: 35,
    bathrooms: 30,
    capacity: 60,
    pricePerNight: 55000,
    amenities: ['wifi', 'restaurant', 'piscine', 'parking', 'salle_conference'],
    ...overrides,
  });
}

export function buildLocationImmo(overrides: BuildPropertyInput = {}) {
  return buildProperty({
    propertyType: PropertyType.immobilier_location,
    pricePerNight: null,
    pricePerMonth: 200000,
    paymentOptions: [PaymentOption.full_online],
    amenities: ['wifi', 'gardien', 'parking'],
    ...overrides,
  });
}

export function buildTerrain(overrides: BuildPropertyInput = {}) {
  return buildProperty({
    propertyType: PropertyType.immobilier_terrain,
    pricePerNight: null,
    pricePerMonth: null,
    priceSale: 15000000,
    rooms: null,
    bedrooms: null,
    beds: null,
    bathrooms: null,
    capacity: null,
    paymentOptions: [PaymentOption.full_online],
    amenities: ['titre_foncier', 'viabilise'],
    ...overrides,
  });
}

export function buildVenteImmo(overrides: BuildPropertyInput = {}) {
  return buildProperty({
    propertyType: PropertyType.immobilier_achat,
    pricePerNight: null,
    pricePerMonth: null,
    priceSale: 40000000,
    paymentOptions: [PaymentOption.full_online],
    amenities: ['piscine', 'garage', 'jardin', 'titre_foncier'],
    ...overrides,
  });
}

export function buildRestaurant(overrides: BuildPropertyInput = {}) {
  return buildProperty({
    propertyType: PropertyType.restaurant,
    pricePerNight: null,
    pricePerMonth: null,
    rooms: null,
    bedrooms: null,
    beds: null,
    capacity: 40,
    cuisineType: 'Cuisine ivoirienne',
    openingHours: { mar: ['12:00-14:30', '19:00-22:30'], ven: ['12:00-14:30', '19:00-23:00'], sam: ['12:00-15:00', '19:00-23:00'] },
    amenities: ['terrasse', 'climatisation', 'parking'],
    ...overrides,
  });
}

// ─── Prisma factory (avec DB) ─────────────────────────────────────────────────

type CreatePropertyInput = BuildPropertyInput & { id?: string };

export async function createProperty(
  prisma: PrismaClient,
  overrides: CreatePropertyInput = {},
): Promise<Property> {
  const { id, ...data } = overrides;
  return prisma.property.create({
    data: {
      id: id ?? undefined,
      ...buildProperty(data),
    },
  });
}

export async function createResidence(
  prisma: PrismaClient,
  overrides: CreatePropertyInput = {},
): Promise<Property> {
  const { id, ...data } = overrides;
  return prisma.property.create({
    data: { id: id ?? undefined, ...buildResidence(data) },
  });
}

export async function createHotel(
  prisma: PrismaClient,
  overrides: CreatePropertyInput = {},
): Promise<Property> {
  const { id, ...data } = overrides;
  return prisma.property.create({
    data: { id: id ?? undefined, ...buildHotel(data) },
  });
}

export async function createRestaurant(
  prisma: PrismaClient,
  overrides: CreatePropertyInput = {},
): Promise<Property> {
  const { id, ...data } = overrides;
  return prisma.property.create({
    data: { id: id ?? undefined, ...buildRestaurant(data) },
  });
}
