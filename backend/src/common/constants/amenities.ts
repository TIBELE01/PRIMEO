// Standard amenities list for property listings
export const Amenity = {
  // General
  WIFI: 'wifi',
  PARKING: 'parking',
  AIR_CONDITIONING: 'air_conditioning',
  SECURITY: 'security',
  GENERATOR: 'generator',
  // Hébergement / Hôtellerie
  POOL: 'pool',
  GYM: 'gym',
  KITCHEN: 'kitchen',
  WASHING_MACHINE: 'washing_machine',
  TV: 'tv',
  HOT_WATER: 'hot_water',
  BALCONY: 'balcony',
  GARDEN: 'garden',
  // Restauration
  TERRACE: 'terrace',
  DELIVERY: 'delivery',
  TAKEAWAY: 'takeaway',
  PRIVATE_ROOM: 'private_room',
  LIVE_MUSIC: 'live_music',
  // Immobilier
  ELEVATOR: 'elevator',
  CONCIERGE: 'concierge',
  STORAGE: 'storage',
} as const;

export type Amenity = (typeof Amenity)[keyof typeof Amenity];
