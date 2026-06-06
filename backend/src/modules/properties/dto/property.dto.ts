// Zod DTOs for property endpoints — aligned with Prisma PropertyType enum
import { z } from 'zod';

const PROPERTY_TYPES = [
  'residence',
  'hotel',
  'immobilier_location',
  'immobilier_terrain',
  'immobilier_achat',
  'restaurant',
] as const;

const PAYMENT_OPTIONS = ['full_online', 'ten_percent_online', 'zero_online'] as const;

export const CreatePropertyDto = z
  .object({
    title: z.string().min(3).max(200).trim(),
    propertyType: z.enum(PROPERTY_TYPES),
    description: z.string().min(10).max(5000).trim(),

    // Caractéristiques physiques
    rooms: z.number().int().positive().optional(),
    bedrooms: z.number().int().positive().optional(),
    beds: z.number().int().positive().optional(),
    bathrooms: z.number().int().positive().optional(),
    surface: z.number().positive().optional(),
    capacity: z.number().int().positive().optional(),

    // Prix (requis selon le type)
    pricePerNight: z.number().int().positive().optional(),
    pricePerMonth: z.number().int().positive().optional(),
    priceSale: z.number().int().positive().optional(),

    // Localisation
    street: z.string().min(3).max(200).trim().optional(),
    city: z.string().min(2).max(100).trim(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),

    // Options
    amenities: z.array(z.string().max(100)).default([]),
    paymentOptions: z.array(z.enum(PAYMENT_OPTIONS)).min(1),
    rules: z.record(z.unknown()).optional(),

    // Restaurants uniquement
    cuisineType: z.string().max(100).optional(),
    openingHours: z.record(z.unknown()).optional(),

    // Immobilier — champs spécifiques
    floor:            z.number().int().min(0).max(200).optional(),
    yearBuilt:        z.number().int().min(1800).max(2100).optional(),
    availabilityDate: z.string().optional(), // ISO date string YYYY-MM-DD
    diagnostics:      z.record(z.unknown()).optional(),

    // Hôtel — types de chambres
    roomTypes: z
      .array(
        z.object({
          label:        z.string().min(1).max(80),
          pricePerNight: z.number().int().positive(),
          capacity:     z.number().int().positive(),
          beds:         z.number().int().min(0).optional(),
          amenities:    z.array(z.string()).optional(),
        })
      )
      .optional(),
  })
  .refine(
    (d) => {
      // Résidence : prix par nuit obligatoire
      if (d.propertyType === 'residence') return !!d.pricePerNight;
      // Hôtel : au moins un type de chambre OU un prix par nuit
      if (d.propertyType === 'hotel') return (d.roomTypes?.length ?? 0) > 0 || !!d.pricePerNight;
      if (d.propertyType === 'immobilier_location') return !!d.pricePerMonth;
      if (['immobilier_terrain', 'immobilier_achat'].includes(d.propertyType)) return !!d.priceSale;
      return true; // restaurant — pas de prix obligatoire
    },
    { message: 'Le champ de prix requis est absent pour ce type de propriété' }
  );

export type CreatePropertyInput = z.infer<typeof CreatePropertyDto>;

export const UpdatePropertyDto = z.object({
  title:         z.string().min(3).max(200).trim().optional(),
  description:   z.string().min(10).max(5000).trim().optional(),
  rooms:         z.number().int().positive().optional(),
  bedrooms:      z.number().int().positive().optional(),
  beds:          z.number().int().positive().optional(),
  bathrooms:     z.number().int().positive().optional(),
  surface:       z.number().positive().optional(),
  capacity:      z.number().int().positive().optional(),
  pricePerNight: z.number().int().positive().optional(),
  pricePerMonth: z.number().int().positive().optional(),
  priceSale:     z.number().int().positive().optional(),
  street:        z.string().min(3).max(200).trim().optional(),
  city:          z.string().min(2).max(100).trim().optional(),
  latitude:      z.number().min(-90).max(90).optional(),
  longitude:     z.number().min(-180).max(180).optional(),
  amenities:     z.array(z.string().max(100)).optional(),
  paymentOptions: z.array(z.enum(PAYMENT_OPTIONS)).min(1).optional(),
  rules:         z.record(z.unknown()).optional(),
  cuisineType:   z.string().max(100).optional(),
  openingHours:  z.record(z.unknown()).optional(),
  // Immobilier
  floor:            z.number().int().min(0).max(200).optional(),
  yearBuilt:        z.number().int().min(1800).max(2100).optional(),
  availabilityDate: z.string().optional(),
  diagnostics:      z.record(z.unknown()).optional(),
  // Hôtel
  roomTypes: z
    .array(
      z.object({
        label:         z.string().min(1).max(80),
        pricePerNight: z.number().int().positive(),
        capacity:      z.number().int().positive(),
        beds:          z.number().int().min(0).optional(),
        amenities:     z.array(z.string()).optional(),
      })
    )
    .optional(),
});
export type UpdatePropertyInput = z.infer<typeof UpdatePropertyDto>;

export const SearchPropertiesDto = z
  .object({
    q: z.string().max(200).optional(),
    // Accepte un type unique OU plusieurs séparés par virgule (ex: "immobilier_location,immobilier_achat,immobilier_terrain")
    propertyType: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    minPrice: z.coerce.number().int().positive().optional(),
    maxPrice: z.coerce.number().int().positive().optional(),
    checkIn: z.string().date().optional(),
    checkOut: z.string().date().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    amenities: z.string().max(500).optional(), // comma-separated
    paymentOption: z.enum(PAYMENT_OPTIONS).optional(),
    minCapacity: z.coerce.number().int().positive().optional(),
    // Geo-radius search
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(100).optional(),
    // Pagination
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  })
  .refine(
    (d) => !(d.checkIn && d.checkOut && new Date(d.checkIn) >= new Date(d.checkOut)),
    { message: 'checkOut doit être postérieur à checkIn' }
  )
  .refine(
    (d) => {
      const geo = [d.lat, d.lon, d.radiusKm].filter((v) => v !== undefined);
      return geo.length === 0 || geo.length === 3;
    },
    { message: 'lat, lon et radiusKm sont tous requis pour la recherche géographique' }
  );

export type SearchPropertiesInput = z.infer<typeof SearchPropertiesDto>;

export const AddMediaDto = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  mediaType: z.enum(['photo', 'video', 'virtual_tour_360']).default('photo'),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});
export type AddMediaInput = z.infer<typeof AddMediaDto>;

export const RejectPropertyDto = z.object({
  reason: z.string().min(10).max(500),
});
