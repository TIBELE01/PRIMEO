// Activation / désactivation des secteurs d'activité (« cartes » de l'accueil) :
// Résidence, Hôtel, Immobilier, Restaurant.
//
// Un secteur désactivé par un administrateur n'accepte plus AUCUNE nouvelle
// activité : inscription du type de compte correspondant, création d'annonce,
// réservation, commande, apparition dans la recherche. L'existant (réservations
// en cours, messages, historique) n'est ni supprimé ni modifié.
//
// Stockage : platform_config['sector_cards'] = { residence, hotel, immobilier,
// restaurant } (booléens). Absence de ligne ou de clé ⇒ secteur ACTIVÉ.
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { logger } from '../../common/utils/logger';

export const SECTORS = ['residence', 'hotel', 'immobilier', 'restaurant'] as const;
export type Sector = (typeof SECTORS)[number];
export type SectorStates = Record<Sector, boolean>;

export const SECTOR_CONFIG_KEY = 'sector_cards';

const SECTOR_LABELS: Record<Sector, string> = {
  residence: 'Résidence',
  hotel: 'Hôtel',
  immobilier: 'Immobilier',
  restaurant: 'Restaurant',
};

// Types d'annonce (enum PropertyType) rattachés à chaque secteur
const PROPERTY_TYPES_BY_SECTOR: Record<Sector, string[]> = {
  residence: ['residence'],
  hotel: ['hotel'],
  immobilier: ['immobilier_location', 'immobilier_terrain', 'immobilier_achat'],
  restaurant: ['restaurant'],
};

// Type de compte professionnel (enum AccountType) rattaché à chaque secteur
const ACCOUNT_TYPE_BY_SECTOR: Record<Sector, string> = {
  residence: 'professional_hebergement',
  hotel: 'professional_hotel',
  immobilier: 'professional_immobilier',
  restaurant: 'restaurateur',
};

const ALL_ENABLED: SectorStates = { residence: true, hotel: true, immobilier: true, restaurant: true };

// Cache court : évite une requête par appel tout en répercutant vite une bascule
// faite sur une autre instance. L'instance qui enregistre la bascule l'applique
// immédiatement (cache remplacé à l'écriture).
const CACHE_TTL_MS = 10_000;
let cache: { states: SectorStates; fetchedAt: number } | null = null;

function normalize(value: unknown): SectorStates {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const states = { ...ALL_ENABLED };
  for (const sector of SECTORS) {
    // Seul un `false` explicite désactive : toute autre valeur laisse le secteur actif
    if (raw[sector] === false) states[sector] = false;
  }
  return states;
}

/** Secteur d'un type d'annonce, ou null si le type n'appartient à aucun secteur. */
export function sectorOfPropertyType(propertyType: string | null | undefined): Sector | null {
  if (!propertyType) return null;
  return SECTORS.find((s) => PROPERTY_TYPES_BY_SECTOR[s].includes(propertyType)) ?? null;
}

/** Secteur d'un type de compte professionnel, ou null (client, admin). */
export function sectorOfAccountType(accountType: string | null | undefined): Sector | null {
  if (!accountType) return null;
  return SECTORS.find((s) => ACCOUNT_TYPE_BY_SECTOR[s] === accountType) ?? null;
}

function unavailable(sector: Sector): HttpError {
  return new HttpError(
    503,
    `Le service ${SECTOR_LABELS[sector]} est temporairement indisponible.`,
    { code: 'SECTOR_DISABLED', sector },
  );
}

export const sectorsService = {
  /** État courant des quatre secteurs. En cas d'erreur de lecture : tout activé. */
  async getStates(forceRefresh = false): Promise<SectorStates> {
    if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.states;
    }
    try {
      const row = await prisma.platformConfig.findUnique({ where: { key: SECTOR_CONFIG_KEY } });
      const states = normalize(row?.value);
      cache = { states, fetchedAt: Date.now() };
      return states;
    } catch (err) {
      // Une panne de lecture ne doit pas fermer la plateforme : on garde le dernier
      // état connu, sinon tout activé.
      logger.warn('Secteurs : lecture de la configuration impossible', { error: (err as Error).message });
      return cache?.states ?? { ...ALL_ENABLED };
    }
  },

  /** Modifie un ou plusieurs secteurs (les autres restent inchangés). */
  async setStates(patch: Partial<SectorStates>, adminId: string): Promise<SectorStates> {
    const current = await sectorsService.getStates(true);
    const next: SectorStates = { ...current };
    for (const sector of SECTORS) {
      if (typeof patch[sector] === 'boolean') next[sector] = patch[sector] as boolean;
    }

    await prisma.platformConfig.upsert({
      where: { key: SECTOR_CONFIG_KEY },
      create: { key: SECTOR_CONFIG_KEY, value: next, updatedBy: adminId },
      update: { value: next, updatedBy: adminId },
    });
    cache = { states: next, fetchedAt: Date.now() };

    const changed = SECTORS.filter((s) => current[s] !== next[s]);
    if (changed.length > 0) {
      await prisma.auditLog
        .create({
          data: {
            userId: adminId,
            action: 'admin.sectors.update',
            targetType: 'platform_config',
            targetId: SECTOR_CONFIG_KEY,
            description: changed
              .map((s) => `${SECTOR_LABELS[s]} ${next[s] ? 'activé' : 'désactivé'}`)
              .join(', '),
            metadata: { old: current, new: next },
          },
        })
        .catch((err) => logger.warn('Secteurs : audit non créé', err));
      logger.info('Secteurs mis à jour', { adminId, old: current, new: next });
    }
    return next;
  },

  /** Types d'annonce actuellement masqués (secteurs désactivés). */
  async getDisabledPropertyTypes(): Promise<string[]> {
    const states = await sectorsService.getStates();
    return SECTORS.filter((s) => !states[s]).flatMap((s) => PROPERTY_TYPES_BY_SECTOR[s]);
  },

  /** Lève 503 SECTOR_DISABLED si le secteur de ce type d'annonce est désactivé. */
  async assertPropertyTypeEnabled(propertyType: string | null | undefined): Promise<void> {
    const sector = sectorOfPropertyType(propertyType);
    if (!sector) return;
    const states = await sectorsService.getStates();
    if (!states[sector]) throw unavailable(sector);
  },

  /** Lève 503 SECTOR_DISABLED si le secteur de ce type de compte est désactivé. */
  async assertAccountTypeEnabled(accountType: string | null | undefined): Promise<void> {
    const sector = sectorOfAccountType(accountType);
    if (!sector) return;
    const states = await sectorsService.getStates();
    if (!states[sector]) throw unavailable(sector);
  },

  /** Vide le cache (tests). */
  _resetCache(): void {
    cache = null;
  },
};

// ── Format d'échange avec l'admin et le mobile ────────────────────────────────

export interface SectorFlags {
  residence_enabled: boolean;
  hotel_enabled: boolean;
  immobilier_enabled: boolean;
  restaurant_enabled: boolean;
}

export function toFlags(states: SectorStates): SectorFlags {
  return {
    residence_enabled: states.residence,
    hotel_enabled: states.hotel,
    immobilier_enabled: states.immobilier,
    restaurant_enabled: states.restaurant,
  };
}

export function fromFlags(flags: Partial<SectorFlags>): Partial<SectorStates> {
  const patch: Partial<SectorStates> = {};
  if (typeof flags.residence_enabled === 'boolean') patch.residence = flags.residence_enabled;
  if (typeof flags.hotel_enabled === 'boolean') patch.hotel = flags.hotel_enabled;
  if (typeof flags.immobilier_enabled === 'boolean') patch.immobilier = flags.immobilier_enabled;
  if (typeof flags.restaurant_enabled === 'boolean') patch.restaurant = flags.restaurant_enabled;
  return patch;
}
