// Shared property types
export type PropertyType =
  | 'maison' | 'appartement' | 'villa' | 'studio'
  | 'hotel' | 'auberge' | 'guesthouse'
  | 'bureau' | 'local_commercial' | 'terrain' | 'immeuble'
  | 'restaurant' | 'maquis' | 'cafe' | 'fast_food';

export interface PropertySummary {
  id: string;
  name: string;
  type: PropertyType;
  city: string;
  address: string;
  pricePerNight: number | null;
  pricePerMonth: number | null;
  averagePrice: number | null;
  images: string[];
  amenities: string[];
  rating: number;
  reviewCount: number;
  isBoosted: boolean;
  isPublished: boolean;
}
