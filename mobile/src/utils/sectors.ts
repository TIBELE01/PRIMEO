// Secteurs d'activité (« cartes » de l'accueil) activables par l'administrateur :
// Résidence, Hôtel, Immobilier, Restaurant.
//
// Fonctions pures — l'état vient de GET /api/config/features (voir useSectorFlags).
// Le serveur applique déjà ces règles (recherche filtrée, actions refusées) ;
// l'application s'en sert pour ne pas PROPOSER ce qui est désactivé.

export type Sector = 'residence' | 'hotel' | 'immobilier' | 'restaurant';

export interface SectorFlags {
  residence_enabled: boolean;
  hotel_enabled: boolean;
  immobilier_enabled: boolean;
  restaurant_enabled: boolean;
}

/** Par défaut tout est activé : une panne réseau ne doit pas vider l'application. */
export const ALL_SECTORS_ENABLED: SectorFlags = {
  residence_enabled: true,
  hotel_enabled: true,
  immobilier_enabled: true,
  restaurant_enabled: true,
};

const FLAG_OF_SECTOR: Record<Sector, keyof SectorFlags> = {
  residence: 'residence_enabled',
  hotel: 'hotel_enabled',
  immobilier: 'immobilier_enabled',
  restaurant: 'restaurant_enabled',
};

// Types d'annonce : valeurs de la base ET valeurs normalisées côté application
const SECTOR_OF_PROPERTY_TYPE: Record<string, Sector> = {
  residence: 'residence',
  apartment: 'residence',
  villa: 'residence',
  hotel: 'hotel',
  immobilier: 'immobilier',
  immobilier_location: 'immobilier',
  immobilier_achat: 'immobilier',
  immobilier_terrain: 'immobilier',
  real_estate: 'immobilier',
  restaurant: 'restaurant',
};

const SECTOR_OF_ACCOUNT_TYPE: Record<string, Sector> = {
  professional_hebergement: 'residence',
  professional_hotel: 'hotel',
  professional_immobilier: 'immobilier',
  restaurateur: 'restaurant',
};

/** Normalise une réponse serveur : seul un `false` explicite désactive un secteur. */
export function parseSectorFlags(raw: unknown): SectorFlags {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    residence_enabled: data.residence_enabled !== false,
    hotel_enabled: data.hotel_enabled !== false,
    immobilier_enabled: data.immobilier_enabled !== false,
    restaurant_enabled: data.restaurant_enabled !== false,
  };
}

export function isSectorEnabled(flags: SectorFlags, sector: Sector): boolean {
  return flags[FLAG_OF_SECTOR[sector]] !== false;
}

export function sectorOfPropertyType(type: string | null | undefined): Sector | null {
  return (type && SECTOR_OF_PROPERTY_TYPE[type]) || null;
}

export function sectorOfAccountType(accountType: string | null | undefined): Sector | null {
  return (accountType && SECTOR_OF_ACCOUNT_TYPE[accountType]) || null;
}

/** Un type d'annonce inconnu n'appartient à aucun secteur : il reste visible. */
export function isPropertyTypeEnabled(flags: SectorFlags, type: string | null | undefined): boolean {
  const sector = sectorOfPropertyType(type);
  return sector ? isSectorEnabled(flags, sector) : true;
}

/** Le compte client (et tout type hors secteur) reste toujours proposé. */
export function isAccountTypeEnabled(flags: SectorFlags, accountType: string | null | undefined): boolean {
  const sector = sectorOfAccountType(accountType);
  return sector ? isSectorEnabled(flags, sector) : true;
}

/** Retire d'une liste les annonces dont le secteur est désactivé. */
export function filterEnabledProperties<T extends { type?: string | null; propertyType?: string | null }>(
  items: T[],
  flags: SectorFlags,
): T[] {
  return items.filter((item) => isPropertyTypeEnabled(flags, item.type ?? item.propertyType));
}

/** Retire d'une liste d'options (type de compte, filtre de type…) celles d'un secteur désactivé. */
export function filterEnabledOptions<T>(
  options: T[],
  flags: SectorFlags,
  sectorOf: (option: T) => Sector | null,
): T[] {
  return options.filter((option) => {
    const sector = sectorOf(option);
    return sector ? isSectorEnabled(flags, sector) : true;
  });
}

export const SECTOR_UNAVAILABLE_MESSAGE = 'Service temporairement indisponible';
