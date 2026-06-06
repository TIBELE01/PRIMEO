// Property, PropertyType, SearchParams, VirtualTour, Review types

export type PropertyType =
  | 'hotel' | 'apartment' | 'villa' | 'guesthouse' | 'hostel'
  | 'resort' | 'restaurant' | 'real_estate';

export interface PropertyImage { id: string; url: string; isPrimary: boolean; }
export interface PropertyAmenity { id: string; name: string; icon: string; }

export interface PropertyOwner {
  id: string; firstName: string; lastName: string;
  avatarUrl: string | null; isSuperHost?: boolean;
  memberSince?: string; totalReviews?: number; overallRating?: number;
}

export interface PanoramaHotspot {
  id: string; targetPanoramaId: string; label: string; theta: number; phi: number;
}
export interface Panorama { id: string; roomName: string; imageUrl: string; hotspots: PanoramaHotspot[]; }
export interface VirtualTourData { available: boolean; panoramas: Panorama[]; }

export interface ReviewCriteria {
  cleanliness?: number; location?: number; value?: number;
  service?: number; communication?: number;
}
export interface Review {
  id: string; authorName: string; authorAvatarUrl?: string;
  rating: number; criteria?: ReviewCriteria; comment: string; createdAt: string;
}
export interface ReviewsSummary {
  average: number; total: number; criteria?: ReviewCriteria; items: Review[];
}

// ── Type-specific extras ──────────────────────────────────────────────
export interface MenuItem {
  id: string; name: string; description?: string; price: number;
  imageUrl?: string; category?: string;
}
export interface RealEstateDocument {
  id: string; label: string; icon: string; verified: boolean;
}
export interface NearbyPlace {
  id: string; name: string; category: 'commerce' | 'transport' | 'attraction' | 'health' | 'education';
  distance: string; icon: string;
}
export interface FaqItem { id: string; question: string; answer: string; }

export interface Property {
  id: string; name: string; description: string; type: PropertyType;
  city: string; address: string; latitude: number | null; longitude: number | null;
  pricePerNight: number | null; priceForSale: number | null; pricePerMonth?: number | null;
  images: PropertyImage[]; amenities: PropertyAmenity[];
  rating: number; reviewCount: number; isBoosted: boolean; isPublished: boolean;
  maxGuests: number; bedrooms: number; bathrooms: number;
  owner: PropertyOwner; virtualTour?: VirtualTourData;
  isSuperHost?: boolean; reviewsSummary?: ReviewsSummary;
  area?: number; // m² — for real_estate
  createdAt: string; updatedAt: string;

  // ── Optional type-specific extras (restaurant / real estate) ──
  cuisineType?: string;          // restaurant
  openingHours?: string;         // restaurant
  capacity?: number;             // restaurant — seats
  menu?: MenuItem[];             // restaurant
  documents?: RealEstateDocument[]; // real_estate (legacy)
  subType?: 'rent' | 'buy_house' | 'buy_land'; // real_estate
  nearby?: NearbyPlace[];
  faq?: FaqItem[];
  cancellationPolicy?: string;

  // Immobilier — champs spécifiques
  floor?: number | null;            // étage (0 = rez-de-chaussée)
  yearBuilt?: number | null;        // année de construction
  availabilityDate?: string | null; // date de disponibilité ISO
  diagnostics?: Record<string, boolean> | null;
  rooms?: number | null;            // nombre de pièces

  // Hôtel — types de chambres
  roomTypes?: Array<{
    id?: string;
    label: string;
    pricePerNight: number;
    capacity: number;
    beds?: number;
    amenities?: string[];
  }> | null;

  propertyType?: string; // type brut backend (residence, hotel, immobilier_*, restaurant)
}

export interface SearchParams {
  query?: string; city?: string; type?: PropertyType;
  checkIn?: string; checkOut?: string; guests?: number;
  minPrice?: number; maxPrice?: number; amenities?: string[];
  minRating?: number; maxDistance?: number;
  cuisineType?: string; // restaurants only
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'distance';
  page?: number; limit?: number;
}
