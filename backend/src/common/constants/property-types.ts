// Property/listing types covering the four business sectors
export const PropertyType = {
  // Hébergement
  MAISON: 'maison',
  APPARTEMENT: 'appartement',
  VILLA: 'villa',
  STUDIO: 'studio',
  // Hôtellerie
  HOTEL: 'hotel',
  AUBERGE: 'auberge',
  GUESTHOUSE: 'guesthouse',
  // Immobilier (à louer / à vendre)
  BUREAU: 'bureau',
  LOCAL_COMMERCIAL: 'local_commercial',
  TERRAIN: 'terrain',
  IMMEUBLE: 'immeuble',
  // Restauration
  RESTAURANT: 'restaurant',
  MAQUIS: 'maquis',
  CAFE: 'cafe',
  FAST_FOOD: 'fast_food',
} as const;

export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const PROPERTY_SECTORS = {
  HEBERGEMENT: ['maison', 'appartement', 'villa', 'studio'] as PropertyType[],
  HOTELLERIE: ['hotel', 'auberge', 'guesthouse'] as PropertyType[],
  IMMOBILIER: ['bureau', 'local_commercial', 'terrain', 'immeuble'] as PropertyType[],
  RESTAURATION: ['restaurant', 'maquis', 'cafe', 'fast_food'] as PropertyType[],
} as const;
