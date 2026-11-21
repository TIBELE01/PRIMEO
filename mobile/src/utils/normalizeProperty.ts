// Normalise les données brutes de l'API vers le type Property utilisé par l'interface.
// Le backend utilise des noms différents : title/name, media/images, priceSale/priceForSale,
// surface/area, propertyType/type, status/isPublished — ce fichier fait le pont.
import type { Property, PropertyAmenity, PropertyType, Review, ReviewCriteria, ReviewsSummary } from '../types/property';

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

// Normalise une visite virtuelle : garantit que `panoramas` est toujours un
// tableau et que chaque panorama possède un tableau `hotspots`. Sans ce garde-fou,
// un backend renvoyant `{ available: true }` sans panoramas faisait planter le
// bouton de visite et l'écran 3D (« Cannot read properties of undefined »).
function normalizeVirtualTour(raw: any): Property['virtualTour'] {
  if (raw && typeof raw === 'object') {
    const panoramas = Array.isArray(raw.panoramas)
      ? raw.panoramas
          .filter((p: any) => p && typeof p === 'object')
          .map((p: any, i: number) => ({
            id:       p.id ?? `pano-${i}`,
            roomName: p.roomName ?? p.name ?? `Pièce ${i + 1}`,
            imageUrl: p.imageUrl ?? p.url ?? '',
            hotspots: Array.isArray(p.hotspots) ? p.hotspots.filter(Boolean) : [],
          }))
          .filter((p: any) => p.imageUrl)
      : [];
    return { available: !!raw.available && panoramas.length > 0, panoramas };
  }
  return undefined;
}

/** Avis renvoyé par l'API (détail d'annonce ou /reviews/property/:id) → avis affichable. */
export function normalizeReview(r: any): Review {
  const person = r?.reviewer ?? r?.author ?? r?.booking?.client ?? {};
  const first = String(person.firstName ?? '').trim();
  const last = String(person.lastName ?? '').trim();
  const crit: ReviewCriteria = {};
  if (r?.cleanlinessRating != null) crit.cleanliness = num(r.cleanlinessRating);
  if (r?.locationRating != null) crit.location = num(r.locationRating);
  if (r?.valueRating != null) crit.value = num(r.valueRating);
  if (r?.serviceRating != null) crit.service = num(r.serviceRating);
  if (r?.communicationRating != null) crit.communication = num(r.communicationRating);
  return {
    id: String(r?.id ?? Math.random().toString(36).slice(2)),
    authorName: [first, last ? `${last[0]}.` : ''].filter(Boolean).join(' ') || 'Voyageur',
    authorAvatarUrl: person.avatarUrl ?? undefined,
    rating: num(r?.rating, 0),
    criteria: Object.keys(crit).length ? crit : undefined,
    comment: String(r?.comment ?? ''),
    createdAt: r?.publishedAt ?? r?.createdAt ?? new Date().toISOString(),
    media: Array.isArray(r?.media) ? r.media.filter((m: any) => m?.url).map((m: any) => ({ id: String(m.id ?? m.url), url: m.url })) : undefined,
    reply: r?.reply ?? r?.responseFromProfessional ?? null,
  };
}

/** Résumé des avis à partir des avis inclus dans le détail d'annonce (les plus récents). */
function buildReviewsSummary(raw: any): ReviewsSummary | undefined {
  if (raw?.reviewsSummary) return raw.reviewsSummary;
  if (!Array.isArray(raw?.reviews)) return undefined;
  const items = raw.reviews.map(normalizeReview);
  const total = num(raw.reviewCount, items.length) || items.length;
  const average = num(raw.rating, 0) || (items.length ? items.reduce((a: number, r: Review) => a + r.rating, 0) / items.length : 0);
  return { average, total, items };
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
    // Modes de paiement acceptés par la propriété (full_online, ten_percent_online, zero_online)
    paymentOptions: Array.isArray(raw.paymentOptions) ? raw.paymentOptions.filter((o: unknown) => typeof o === 'string') : undefined,
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
    reviewsSummary: buildReviewsSummary(raw),
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
    // hasVirtualTour en BDD → virtualTour.available côté front.
    // normalizeVirtualTour garantit panoramas[] + hotspots[] et ne marque
    // « available » que s'il existe réellement au moins un panorama.
    virtualTour: normalizeVirtualTour(raw.virtualTour)
      ?? (raw.hasVirtualTour ? { available: false, panoramas: [] } : undefined),
  };
}

/** Normalise un tableau de propriétés brutes, ignore les entrées null/invalides. */
export function normalizeProperties(raw: unknown): Property[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(Boolean).map(normalizeProperty);
}
