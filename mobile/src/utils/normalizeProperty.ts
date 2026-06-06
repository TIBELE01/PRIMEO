// Normalise les données brutes de l'API vers le type Property utilisé par l'interface.
// Le backend utilise des noms différents : title/name, media/images, priceSale/priceForSale,
// surface/area, propertyType/type, status/isPublished — ce fichier fait le pont.
import type { Property, PropertyAmenity, PropertyType } from '../types/property';

// Convertit les types DB (residence, immobilier_*) vers les types front-end (apartment, real_estate…)
function mapPropertyType(raw: string): PropertyType {
  switch (raw) {
    case 'residence':           return 'apartment';
    case 'immobilier_location': return 'real_estate';
    case 'immobilier_achat':    return 'real_estate';
    case 'immobilier_terrain':  return 'real_estate';
    case 'hotel':               return 'hotel';
    case 'restaurant':          return 'restaurant';
    default:                    return (raw as PropertyType) ?? 'apartment';
  }
}

/** Coerce n'importe quelle valeur en nombre fini, avec fallback. */
export function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce en nombre ou null (pour les champs de prix optionnels). */
function numOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

// Correspondances clé BDD → libellé français + emoji
const AMENITY_LABELS: Record<string, { name: string; emoji: string }> = {
  wifi:             { name: 'Wi-Fi',                emoji: '📶' },
  parking:          { name: 'Parking',              emoji: '🅿️' },
  air_conditioning: { name: 'Climatisation',        emoji: '❄️' },
  ac:               { name: 'Climatisation',        emoji: '❄️' },
  security:         { name: 'Gardiennage 24h/24',   emoji: '🔒' },
  generator:        { name: 'Groupe électrogène',   emoji: '⚡' },
  pool:             { name: 'Piscine',              emoji: '🏊' },
  gym:              { name: 'Salle de sport',       emoji: '💪' },
  kitchen:          { name: 'Cuisine équipée',      emoji: '🍳' },
  washing_machine:  { name: 'Machine à laver',      emoji: '🫧' },
  tv:               { name: 'Télévision',           emoji: '📺' },
  hot_water:        { name: 'Eau chaude',           emoji: '🚿' },
  balcony:          { name: 'Balcon',               emoji: '🌅' },
  garden:           { name: 'Jardin',               emoji: '🌿' },
  terrace:          { name: 'Terrasse extérieure',  emoji: '☀️' },
  delivery:         { name: 'Livraison à domicile', emoji: '🛵' },
  takeaway:         { name: 'À emporter',           emoji: '🥡' },
  private_room:     { name: 'Salle privée',         emoji: '🚪' },
  live_music:       { name: 'Musique live',         emoji: '🎵' },
  elevator:         { name: 'Ascenseur',            emoji: '🛗' },
  concierge:        { name: 'Conciergerie',         emoji: '🛎️' },
  storage:          { name: 'Espace de rangement',  emoji: '📦' },
  breakfast:        { name: 'Petit-déjeuner',       emoji: '🥐' },
  pets:             { name: 'Animaux acceptés',     emoji: '🐾' },
};

// Convertit les équipements (strings BDD ou objets existants) en PropertyAmenity[]
function normalizeAmenities(raw: unknown): PropertyAmenity[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a, i) => {
    if (typeof a === 'string') {
      const meta = AMENITY_LABELS[a] ?? { name: a, emoji: '✓' };
      return { id: `am-${i}`, name: meta.name, icon: meta.emoji };
    }
    if (a && typeof a === 'object') return a as PropertyAmenity;
    return { id: `am-${i}`, name: String(a), icon: '✓' };
  });
}

export function normalizeProperty(raw: any): Property {
  if (!raw || typeof raw !== 'object') return raw;

  // L'API retourne `media[]`, le front attend `images[]`
  const images = Array.isArray(raw.images)
    ? raw.images
    : Array.isArray(raw.media)
      ? raw.media.map((m: any) => ({
          id: m.id ?? `img-${Math.random().toString(36).slice(2)}`,
          url: m.url,
          isPrimary: !!m.isPrimary,
        }))
      : [];

  return {
    ...raw,
    id:            raw.id,
    // Noms de champs différents entre BDD (title) et front (name)
    name:          raw.name          ?? raw.title        ?? '',
    type:          mapPropertyType(raw.type ?? raw.propertyType ?? 'apartment'),
    description:   raw.description   ?? '',
    address:       raw.address       ?? raw.street       ?? raw.city ?? '',
    city:          raw.city          ?? '',
    // Champs numériques avec coercion
    rating:        num(raw.rating, 0),
    reviewCount:   num(raw.reviewCount, 0),
    pricePerNight: numOrNull(raw.pricePerNight),
    // priceSale en BDD → priceForSale côté front
    priceForSale:  numOrNull(raw.priceForSale ?? raw.priceSale),
    pricePerMonth: numOrNull(raw.pricePerMonth),
    latitude:      numOrNull(raw.latitude),
    longitude:     numOrNull(raw.longitude),
    // capacity en BDD → maxGuests côté front
    maxGuests:     num(raw.maxGuests ?? raw.capacity, 0),
    bedrooms:      num(raw.bedrooms, 0),
    bathrooms:     num(raw.bathrooms, 0),
    // surface en BDD → area côté front
    area:          raw.area != null ? num(raw.area) : raw.surface != null ? num(raw.surface) : undefined,
    images,
    amenities:     normalizeAmenities(raw.amenities),
    isBoosted:     !!raw.isBoosted,
    // status 'active' en BDD → isPublished: true côté front
    isPublished:   raw.isPublished != null ? !!raw.isPublished : raw.status === 'active',
    isSuperHost:   !!raw.isSuperHost,
    createdAt:     raw.createdAt ?? new Date().toISOString(),
    updatedAt:     raw.updatedAt ?? new Date().toISOString(),
    owner: raw.owner
      ? {
          ...raw.owner,
          isSuperHost:   !!raw.owner.isSuperHost,
          totalReviews:  raw.owner.totalReviews  != null ? num(raw.owner.totalReviews)  : undefined,
          overallRating: raw.owner.overallRating != null ? num(raw.owner.overallRating) : undefined,
        }
      : undefined,
    // hasVirtualTour en BDD → virtualTour.available côté front
    virtualTour: raw.virtualTour
      ?? (raw.hasVirtualTour ? { available: true, panoramas: [] } : undefined),
  };
}

/** Normalise un tableau de propriétés brutes, ignore les entrées null/invalides. */
export function normalizeProperties(raw: unknown): Property[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(Boolean).map(normalizeProperty);
}
