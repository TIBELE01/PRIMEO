// Amenity list with icon names (Ionicons compatible)

export interface Amenity {
  id: string;
  name: string;
  icon: string; // Ionicons icon name
  category: 'essential' | 'comfort' | 'leisure' | 'safety' | 'accessibility';
}

export const AMENITIES: Amenity[] = [
  // Essential
  { id: 'wifi',           name: 'Wi-Fi',            icon: 'wifi-outline',           category: 'essential' },
  { id: 'parking',        name: 'Parking',           icon: 'car-outline',            category: 'essential' },
  { id: 'air_con',        name: 'Climatisation',     icon: 'snow-outline',           category: 'essential' },
  { id: 'kitchen',        name: 'Cuisine',           icon: 'restaurant-outline',     category: 'essential' },
  { id: 'washer',         name: 'Lave-linge',        icon: 'shirt-outline',          category: 'essential' },
  { id: 'hot_water',      name: 'Eau chaude',        icon: 'water-outline',          category: 'essential' },
  { id: 'electricity',    name: 'Électricité',       icon: 'flash-outline',          category: 'essential' },

  // Comfort
  { id: 'tv',             name: 'Télévision',        icon: 'tv-outline',             category: 'comfort' },
  { id: 'balcony',        name: 'Balcon / Terrasse', icon: 'home-outline',           category: 'comfort' },
  { id: 'breakfast',      name: 'Petit-déjeuner',    icon: 'cafe-outline',           category: 'comfort' },
  { id: 'workspace',      name: 'Espace de travail', icon: 'desktop-outline',        category: 'comfort' },
  { id: 'iron',           name: 'Fer à repasser',    icon: 'shirt-outline',          category: 'comfort' },

  // Leisure
  { id: 'pool',           name: 'Piscine',           icon: 'water-outline',          category: 'leisure' },
  { id: 'gym',            name: 'Salle de sport',    icon: 'barbell-outline',        category: 'leisure' },
  { id: 'garden',         name: 'Jardin',            icon: 'leaf-outline',           category: 'leisure' },
  { id: 'bbq',            name: 'Barbecue',          icon: 'flame-outline',          category: 'leisure' },

  // Safety
  { id: 'smoke_detector', name: 'Détecteur de fumée',icon: 'alert-circle-outline',  category: 'safety' },
  { id: 'fire_ext',       name: 'Extincteur',        icon: 'shield-outline',         category: 'safety' },
  { id: 'first_aid',      name: 'Trousse de secours',icon: 'medkit-outline',         category: 'safety' },
  { id: 'secure_lock',    name: 'Serrure sécurisée', icon: 'lock-closed-outline',   category: 'safety' },
  { id: 'cctv',           name: 'Vidéosurveillance', icon: 'videocam-outline',       category: 'safety' },

  // Accessibility
  { id: 'elevator',       name: 'Ascenseur',         icon: 'arrow-up-outline',       category: 'accessibility' },
  { id: 'wheelchair',     name: 'Accès fauteuil',    icon: 'accessibility-outline',  category: 'accessibility' },
] as const;

export const AMENITY_IDS = AMENITIES.map(a => a.id);
export type AmenityId = typeof AMENITY_IDS[number];

export function getAmenityById(id: string): Amenity | undefined {
  return AMENITIES.find(a => a.id === id);
}
