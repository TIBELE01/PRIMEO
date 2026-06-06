// Per-category config — updated colors: residence/hotel=blue, immobilier=green, restaurant=red
import type { Property } from '@/types/property';

export type CategoryKey = 'residence' | 'hotel' | 'immobilier' | 'restaurant';

export interface FilterOption { value: string; label: string }
export type FilterFieldType = 'range' | 'single' | 'multi';

export interface FilterField {
  id: string;
  label: string;
  type: FilterFieldType;
  icon?: string;
  options?: FilterOption[];
  unit?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  chipPrefix?: string;
}

export interface CategoryConfig {
  key: CategoryKey;
  apiType: string;
  title: string;
  tagline: string;
  icon: string;
  color: string;
  colorDark: string;
  colorSoft: string;
  heroImage: string;
  showDates: boolean;
  dateLabel: string;
  sortOptions: { key: string; label: string }[];
  filters: FilterField[];
  demo: Property[];
}

const img = (url: string) => [{ id: 'i1', url, isPrimary: true }];
const NOW = new Date().toISOString();

const RATING_OPTS: FilterOption[] = [
  { value: '3', label: '★ 3+' }, { value: '3.5', label: '★ 3.5+' },
  { value: '4', label: '★ 4+' }, { value: '4.5', label: '★ 4.5+' },
];
const DISTANCE_OPTS: FilterOption[] = [
  { value: '1', label: '< 1 km' }, { value: '5', label: '< 5 km' },
  { value: '10', label: '< 10 km' }, { value: '25', label: '< 25 km' },
];
const BEDROOM_OPTS: FilterOption[] = [
  { value: '1', label: '1 ch.' }, { value: '2', label: '2 ch.' },
  { value: '3', label: '3 ch.' }, { value: '4', label: '4+ ch.' },
];

export const CATEGORY_CONFIGS: Record<CategoryKey, CategoryConfig> = {
  /* ── RÉSIDENCES ── bleu */
  residence: {
    key: 'residence', apiType: 'residence',
    title: 'Résidences meublées', tagline: 'Villas, appartements et studios confortables pour tous vos séjours.',
    icon: '🏘️', color: '#1056E0', colorDark: '#0841B5', colorSoft: '#EEF4FF',
    heroImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1280&q=80',
    showDates: true, dateLabel: 'Disponibilité',
    sortOptions: [
      { key: 'rating', label: 'Pertinence' }, { key: 'price_asc', label: 'Prix ↑' },
      { key: 'price_desc', label: 'Prix ↓' }, { key: 'newest', label: 'Popularité' }, { key: 'distance', label: 'Distance' },
    ],
    filters: [
      { id: 'price', label: 'Prix / nuit (FCFA)', type: 'range', icon: '💰', unit: 'F', minPlaceholder: '0', maxPlaceholder: 'Max', chipPrefix: 'Prix' },
      { id: 'bedrooms', label: 'Chambres', type: 'single', icon: '🛏️', options: BEDROOM_OPTS },
      { id: 'minRating', label: 'Note minimale', type: 'single', icon: '⭐', options: RATING_OPTS },
      { id: 'maxDistance', label: 'Distance', type: 'single', icon: '📍', options: DISTANCE_OPTS, chipPrefix: 'Dist.' },
      { id: 'amenities', label: 'Équipements', type: 'multi', icon: '🛎️', options: [
        { value: 'wifi', label: '📶 Wi-Fi' }, { value: 'pool', label: '🏊 Piscine' },
        { value: 'ac', label: '❄️ Climatisation' }, { value: 'kitchen', label: '🍳 Cuisine' },
        { value: 'parking', label: '🚗 Parking' }, { value: 'generator', label: '⚡ Groupe élec.' },
        { value: 'security', label: '🔒 Gardiennage' }, { value: 'tv', label: '📺 TV' },
      ] },
      { id: 'badges', label: 'Labels', type: 'multi', icon: '🏷️', options: [
        { value: 'virtual_tour', label: '🔭 Visite 3D' }, { value: 'super_host', label: '⭐ Super Hôte' },
      ] },
    ],
    demo: ([
      { id: 'res-1', type: 'apartment', name: 'Villa Prestige Cocody', city: 'Abidjan · Cocody', pricePerNight: 45000, rating: 4.9, reviewCount: 128, bedrooms: 4, latitude: 5.359, longitude: -3.998, createdAt: NOW, images: img('https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80'), isBoosted: true, virtualTour: { available: true }, isSuperHost: true },
      { id: 'res-2', type: 'apartment', name: 'Appartement Standing Plateau', city: 'Abidjan · Plateau', pricePerNight: 32000, rating: 4.8, reviewCount: 86, bedrooms: 2, latitude: 5.324, longitude: -4.022, createdAt: NOW, images: img('https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'), virtualTour: { available: true } },
      { id: 'res-3', type: 'apartment', name: 'Studio Cosy Marcory', city: 'Abidjan · Marcory', pricePerNight: 18000, rating: 4.6, reviewCount: 41, bedrooms: 1, latitude: 5.300, longitude: -3.984, createdAt: NOW, images: img('https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80') },
      { id: 'res-4', type: 'apartment', name: 'Villa Piscine Assinie', city: 'Assinie', pricePerNight: 95000, rating: 4.9, reviewCount: 167, bedrooms: 4, latitude: 5.130, longitude: -3.470, createdAt: NOW, images: img('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'), isBoosted: true, isSuperHost: true },
      { id: 'res-5', type: 'apartment', name: 'Duplex Moderne Riviera', city: 'Abidjan · Riviera', pricePerNight: 52000, rating: 4.7, reviewCount: 73, bedrooms: 3, latitude: 5.356, longitude: -3.967, createdAt: NOW, images: img('https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'), virtualTour: { available: true } },
      { id: 'res-6', type: 'apartment', name: 'Appart Familial Yopougon', city: 'Abidjan · Yopougon', pricePerNight: 24000, rating: 4.5, reviewCount: 58, bedrooms: 3, latitude: 5.345, longitude: -4.085, createdAt: NOW, images: img('https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=800&q=80') },
      { id: 'res-7', type: 'apartment', name: 'Penthouse Plateau', city: 'Abidjan · Plateau', pricePerNight: 110000, rating: 5.0, reviewCount: 44, bedrooms: 3, latitude: 5.325, longitude: -4.020, createdAt: NOW, images: img('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'), isBoosted: true },
      { id: 'res-8', type: 'apartment', name: 'Maison Jardin Bingerville', city: 'Bingerville', pricePerNight: 38000, rating: 4.6, reviewCount: 29, bedrooms: 3, latitude: 5.355, longitude: -3.888, createdAt: NOW, images: img('https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=800&q=80') },
      { id: 'res-9', type: 'apartment', name: 'Villa Bord de Lagune', city: 'Abidjan · Angré', pricePerNight: 65000, rating: 4.8, reviewCount: 93, bedrooms: 4, latitude: 5.368, longitude: -3.970, createdAt: NOW, images: img('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'), isSuperHost: true },
      { id: 'res-10', type: 'apartment', name: 'Studio Luxe 2 Plateaux', city: 'Abidjan · 2 Plateaux', pricePerNight: 22000, rating: 4.4, reviewCount: 61, bedrooms: 1, latitude: 5.362, longitude: -3.990, createdAt: NOW, images: img('https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80') },
    ] as unknown) as Property[],
  },

  /* ── HÔTELS ── bleu foncé */
  hotel: {
    key: 'hotel', apiType: 'hotel',
    title: 'Hôtels', tagline: 'Hôtels, guesthouses et resorts de qualité partout en Côte d\'Ivoire.',
    icon: '🏨', color: '#0D47A1', colorDark: '#082F6B', colorSoft: '#E3EEFF',
    heroImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1280&q=80',
    showDates: true, dateLabel: 'Disponibilité',
    sortOptions: [
      { key: 'rating', label: 'Pertinence' }, { key: 'price_asc', label: 'Prix ↑' },
      { key: 'price_desc', label: 'Prix ↓' }, { key: 'newest', label: 'Popularité' }, { key: 'distance', label: 'Distance' },
    ],
    filters: [
      { id: 'price', label: 'Prix / nuit (FCFA)', type: 'range', icon: '💰', unit: 'F', minPlaceholder: '0', maxPlaceholder: 'Max', chipPrefix: 'Prix' },
      { id: 'stars', label: 'Classement (étoiles)', type: 'single', icon: '🌟', options: [
        { value: '2', label: '2★' }, { value: '3', label: '3★' }, { value: '4', label: '4★' }, { value: '5', label: '5★' },
      ], chipPrefix: 'Classe' },
      { id: 'amenities', label: 'Services inclus', type: 'multi', icon: '🛎️', options: [
        { value: 'pool', label: '🏊 Piscine' }, { value: 'spa', label: '💆 Spa' },
        { value: 'restaurant', label: '🍽️ Restaurant' }, { value: 'parking', label: '🚗 Parking' },
        { value: 'gym', label: '🏋️ Salle de sport' }, { value: 'bar', label: '🍸 Bar' },
        { value: 'wifi', label: '📶 Wi-Fi' }, { value: 'ac', label: '❄️ Climatisation' },
      ] },
      { id: 'minRating', label: 'Note minimale', type: 'single', icon: '⭐', options: RATING_OPTS },
      { id: 'maxDistance', label: 'Distance', type: 'single', icon: '📍', options: DISTANCE_OPTS, chipPrefix: 'Dist.' },
    ],
    demo: ([
      { id: 'hot-1', type: 'hotel', name: 'Suite Hôtel Riviera', city: 'Abidjan · Riviera', pricePerNight: 58000, rating: 5.0, reviewCount: 204, latitude: 5.356, longitude: -3.967, createdAt: NOW, images: img('https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80'), isSuperHost: true, isBoosted: true },
      { id: 'hot-2', type: 'hotel', name: 'Hôtel Lagune Plateau', city: 'Abidjan · Plateau', pricePerNight: 72000, rating: 4.8, reviewCount: 312, latitude: 5.324, longitude: -4.022, createdAt: NOW, images: img('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'), virtualTour: { available: true } },
      { id: 'hot-3', type: 'hotel', name: 'Resort Bord de Mer Assinie', city: 'Assinie', pricePerNight: 120000, rating: 4.9, reviewCount: 188, latitude: 5.130, longitude: -3.470, createdAt: NOW, images: img('https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'), isBoosted: true, isSuperHost: true },
      { id: 'hot-4', type: 'hotel', name: 'Boutique Hôtel Cocody', city: 'Abidjan · Cocody', pricePerNight: 49000, rating: 4.6, reviewCount: 97, latitude: 5.359, longitude: -3.998, createdAt: NOW, images: img('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80') },
      { id: 'hot-5', type: 'hotel', name: 'Guesthouse Grand-Bassam', city: 'Grand-Bassam', pricePerNight: 35000, rating: 4.7, reviewCount: 142, latitude: 5.210, longitude: -3.740, createdAt: NOW, images: img('https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=800&q=80'), virtualTour: { available: true } },
      { id: 'hot-6', type: 'hotel', name: 'Business Hôtel Marcory', city: 'Abidjan · Marcory', pricePerNight: 41000, rating: 4.4, reviewCount: 64, latitude: 5.300, longitude: -3.984, createdAt: NOW, images: img('https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80') },
      { id: 'hot-7', type: 'hotel', name: 'Palace Hôtel Yamoussoukro', city: 'Yamoussoukro', pricePerNight: 55000, rating: 4.7, reviewCount: 77, latitude: 6.827, longitude: -5.290, createdAt: NOW, images: img('https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80'), isBoosted: true },
      { id: 'hot-8', type: 'hotel', name: 'Safari Lodge Korhogo', city: 'Korhogo', pricePerNight: 38000, rating: 4.5, reviewCount: 33, latitude: 9.458, longitude: -5.633, createdAt: NOW, images: img('https://images.unsplash.com/photo-1586611292717-f828b167408c?auto=format&fit=crop&w=800&q=80') },
      { id: 'hot-9', type: 'hotel', name: 'Hôtel Ivoire Prestige', city: 'Abidjan · Plateau', pricePerNight: 145000, rating: 4.9, reviewCount: 421, latitude: 5.326, longitude: -4.018, createdAt: NOW, images: img('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80'), isSuperHost: true, virtualTour: { available: true } },
      { id: 'hot-10', type: 'hotel', name: 'Eco Lodge Man', city: 'Man', pricePerNight: 28000, rating: 4.3, reviewCount: 19, latitude: 7.413, longitude: -7.554, createdAt: NOW, images: img('https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&w=800&q=80') },
    ] as unknown) as Property[],
  },

  /* ── IMMOBILIER ── vert */
  immobilier: {
    key: 'immobilier', apiType: 'immobilier_location,immobilier_achat,immobilier_terrain',
    title: 'Immobilier', tagline: 'Location longue durée, achat de maisons et terrains en Côte d\'Ivoire.',
    icon: '🏢', color: '#059669', colorDark: '#047857', colorSoft: '#E7F9F2',
    heroImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1280&q=80',
    showDates: false, dateLabel: '',
    sortOptions: [
      { key: 'newest', label: 'Récents' }, { key: 'price_asc', label: 'Prix ↑' },
      { key: 'price_desc', label: 'Prix ↓' }, { key: 'rating', label: 'Pertinence' },
    ],
    filters: [
      { id: 'subType', label: 'Type de bien', type: 'single', icon: '🏗️', options: [
        { value: 'rent', label: '🔑 Location longue durée' }, { value: 'buy_house', label: '🏠 Achat maison' }, { value: 'buy_land', label: '🌍 Achat terrain' },
      ] },
      { id: 'price', label: 'Fourchette de prix (FCFA)', type: 'range', icon: '💰', unit: 'F', minPlaceholder: '0', maxPlaceholder: 'Max', chipPrefix: 'Prix' },
      { id: 'area', label: 'Superficie (m²)', type: 'range', icon: '📐', unit: 'm²', minPlaceholder: 'Min', maxPlaceholder: 'Max', chipPrefix: 'Surf.' },
      { id: 'rooms', label: 'Nombre de pièces', type: 'single', icon: '🚪', options: [
        { value: '1', label: '1 p.' }, { value: '2', label: '2 p.' }, { value: '3', label: '3 p.' }, { value: '4', label: '4 p.' }, { value: '5', label: '5+ p.' },
      ] },
      { id: 'maxDistance', label: 'Distance', type: 'single', icon: '📍', options: DISTANCE_OPTS, chipPrefix: 'Dist.' },
      { id: 'documents', label: 'Documents disponibles', type: 'multi', icon: '📄', options: [
        { value: 'land_title', label: '📜 Titre foncier' }, { value: 'acd', label: '🗂️ ACD' }, { value: 'building_permit', label: '🏗️ Permis de construire' },
      ] },
    ],
    demo: ([
      { id: 'imm-1', type: 'real_estate', name: 'Maison Moderne Bingerville', city: 'Bingerville', priceForSale: 75000000, rating: 4.7, reviewCount: 54, area: 320, bedrooms: 5, latitude: 5.355, longitude: -3.888, createdAt: NOW, images: img('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80') },
      { id: 'imm-2', type: 'real_estate', name: 'Terrain Viabilisé Bassam', city: 'Grand-Bassam', priceForSale: 28000000, rating: 4.5, reviewCount: 12, area: 600, latitude: 5.210, longitude: -3.740, createdAt: NOW, images: img('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80') },
      { id: 'imm-3', type: 'real_estate', name: 'Appartement à louer Cocody', city: 'Abidjan · Cocody', pricePerNight: 350000, rating: 4.8, reviewCount: 33, area: 110, bedrooms: 3, latitude: 5.359, longitude: -3.998, createdAt: NOW, images: img('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'), isBoosted: true },
      { id: 'imm-4', type: 'real_estate', name: 'Villa Haut Standing Riviera', city: 'Abidjan · Riviera', priceForSale: 145000000, rating: 4.9, reviewCount: 28, area: 450, bedrooms: 6, latitude: 5.356, longitude: -3.967, createdAt: NOW, images: img('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'), isBoosted: true },
      { id: 'imm-5', type: 'real_estate', name: 'Studio à louer Plateau', city: 'Abidjan · Plateau', pricePerNight: 180000, rating: 4.4, reviewCount: 19, area: 45, bedrooms: 1, latitude: 5.324, longitude: -4.022, createdAt: NOW, images: img('https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=800&q=80') },
      { id: 'imm-6', type: 'real_estate', name: 'Terrain Constructible Yamoussoukro', city: 'Yamoussoukro', priceForSale: 18000000, rating: 4.2, reviewCount: 7, area: 800, latitude: 6.827, longitude: -5.290, createdAt: NOW, images: img('https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=800&q=80') },
      { id: 'imm-7', type: 'real_estate', name: 'Villa Angré 4 chambres', city: 'Abidjan · Angré', priceForSale: 95000000, rating: 4.6, reviewCount: 41, area: 280, bedrooms: 4, latitude: 5.368, longitude: -3.970, createdAt: NOW, images: img('https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80'), isBoosted: true },
      { id: 'imm-8', type: 'real_estate', name: 'Bureau à louer Plateau', city: 'Abidjan · Plateau', pricePerNight: 450000, rating: 4.5, reviewCount: 15, area: 80, latitude: 5.325, longitude: -4.019, createdAt: NOW, images: img('https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80') },
      { id: 'imm-9', type: 'real_estate', name: 'Terrain Bord de Mer San-Pédro', city: 'San-Pédro', priceForSale: 42000000, rating: 4.3, reviewCount: 9, area: 1200, latitude: 4.747, longitude: -6.636, createdAt: NOW, images: img('https://images.unsplash.com/photo-1440778303588-435521a46e69?auto=format&fit=crop&w=800&q=80') },
      { id: 'imm-10', type: 'real_estate', name: 'Duplex Yopougon 3 pièces', city: 'Abidjan · Yopougon', pricePerNight: 220000, rating: 4.1, reviewCount: 23, area: 95, bedrooms: 2, latitude: 5.345, longitude: -4.085, createdAt: NOW, images: img('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80') },
    ] as unknown) as Property[],
  },

  /* ── RESTAURANTS ── rouge */
  restaurant: {
    key: 'restaurant', apiType: 'restaurant',
    title: 'Restaurants', tagline: 'Restaurants, maquis et tables gastronomiques — réservez en quelques secondes.',
    icon: '🍽️', color: '#DC2626', colorDark: '#991B1B', colorSoft: '#FEF2F2',
    heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1280&q=80',
    showDates: true, dateLabel: 'Date de réservation',
    sortOptions: [
      { key: 'rating', label: 'Mieux notés' }, { key: 'newest', label: 'Nouveautés' },
      { key: 'price_asc', label: 'Prix ↑' }, { key: 'distance', label: 'Distance' },
    ],
    filters: [
      { id: 'cuisineType', label: 'Type de cuisine', type: 'single', icon: '🍲', options: [
        { value: 'Ivoirienne', label: 'Ivoirienne' }, { value: 'Africaine', label: 'Africaine' },
        { value: 'Libanaise', label: 'Libanaise' }, { value: 'Française', label: 'Française' },
        { value: 'Italienne', label: 'Italienne' }, { value: 'Asiatique', label: 'Asiatique' },
        { value: 'Fast-food', label: 'Fast-food' }, { value: 'Végétarienne', label: 'Végétarienne' },
      ] },
      { id: 'price', label: 'Fourchette de prix (FCFA)', type: 'range', icon: '💰', unit: 'F', minPlaceholder: '0', maxPlaceholder: 'Max', chipPrefix: 'Prix' },
      { id: 'minRating', label: 'Note minimale', type: 'single', icon: '⭐', options: RATING_OPTS },
      { id: 'timeSlot', label: 'Créneau disponible', type: 'single', icon: '🕐', options: [
        { value: '12:00-13:30', label: '12:00 – 13:30' }, { value: '13:00-14:30', label: '13:00 – 14:30' },
        { value: '19:30-21:00', label: '19:30 – 21:00' }, { value: '20:00-22:00', label: '20:00 – 22:00' },
        { value: '21:00-23:00', label: '21:00 – 23:00' },
      ], chipPrefix: 'Créneau' },
      { id: 'capacity', label: 'Capacité', type: 'single', icon: '👥', options: [
        { value: '2', label: '2 pers.' }, { value: '4', label: '4 pers.' }, { value: '6', label: '6 pers.' }, { value: '8', label: '8+ pers.' },
      ], chipPrefix: 'Cap.' },
      { id: 'promo', label: 'Promotions', type: 'multi', icon: '🎉', options: [
        { value: 'active', label: '🔥 Promotion active' }, { value: 'happy_hour', label: '🍹 Happy hour' },
      ] },
      { id: 'maxDistance', label: 'Distance', type: 'single', icon: '📍', options: DISTANCE_OPTS, chipPrefix: 'Dist.' },
    ],
    demo: ([
      { id: 'rest-1', type: 'restaurant', name: 'Le Maquis du Val', city: 'Abidjan · Cocody', pricePerNight: 12000, rating: 4.8, reviewCount: 256, latitude: 5.359, longitude: -3.998, createdAt: NOW, images: img('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'), isBoosted: true },
      { id: 'rest-2', type: 'restaurant', name: 'Saveurs d\'Abidjan', city: 'Abidjan · Plateau', pricePerNight: 18000, rating: 4.7, reviewCount: 189, latitude: 5.324, longitude: -4.022, createdAt: NOW, images: img('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80') },
      { id: 'rest-3', type: 'restaurant', name: 'La Table Libanaise', city: 'Abidjan · Marcory', pricePerNight: 22000, rating: 4.9, reviewCount: 301, latitude: 5.300, longitude: -3.984, createdAt: NOW, images: img('https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80'), isSuperHost: true },
      { id: 'rest-4', type: 'restaurant', name: 'Chez Tantie Adjoua', city: 'Abidjan · Yopougon', pricePerNight: 6000, rating: 4.6, reviewCount: 412, latitude: 5.345, longitude: -4.085, createdAt: NOW, images: img('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80') },
      { id: 'rest-5', type: 'restaurant', name: 'Riviera Sushi Bar', city: 'Abidjan · Riviera', pricePerNight: 28000, rating: 4.8, reviewCount: 144, latitude: 5.356, longitude: -3.967, createdAt: NOW, images: img('https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80'), isBoosted: true },
      { id: 'rest-6', type: 'restaurant', name: 'Bistrot du Bord de Mer', city: 'Grand-Bassam', pricePerNight: 16000, rating: 4.5, reviewCount: 98, latitude: 5.210, longitude: -3.740, createdAt: NOW, images: img('https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=800&q=80') },
      { id: 'rest-7', type: 'restaurant', name: 'Gastronomie Plateau', city: 'Abidjan · Plateau', pricePerNight: 35000, rating: 4.9, reviewCount: 178, latitude: 5.325, longitude: -4.021, createdAt: NOW, images: img('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80'), isSuperHost: true, isBoosted: true },
      { id: 'rest-8', type: 'restaurant', name: 'Maquis Traditionnel Adjamé', city: 'Abidjan · Adjamé', pricePerNight: 5500, rating: 4.4, reviewCount: 534, latitude: 5.365, longitude: -4.031, createdAt: NOW, images: img('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80') },
      { id: 'rest-9', type: 'restaurant', name: 'Italian Corner Angré', city: 'Abidjan · Angré', pricePerNight: 24000, rating: 4.7, reviewCount: 87, latitude: 5.368, longitude: -3.970, createdAt: NOW, images: img('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80') },
      { id: 'rest-10', type: 'restaurant', name: 'Waffou Ivoirien Cocody', city: 'Abidjan · Cocody', pricePerNight: 8000, rating: 4.6, reviewCount: 203, latitude: 5.362, longitude: -3.996, createdAt: NOW, images: img('https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80') },
    ] as unknown) as Property[],
  },
};

export const CATEGORY_LIST = Object.values(CATEGORY_CONFIGS);
