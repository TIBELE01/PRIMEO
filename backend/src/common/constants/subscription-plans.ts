// Constantes des formules d'abonnement — Starter / Business / Entreprise
// Toutes les formules sont à 0% de commission depuis la v2.0.
// Les frais Genius Pay (paiement en ligne) sont déduits automatiquement par GP
// et ne sont pas imputés à Primeo.
//
// Ces valeurs sont les valeurs PAR DÉFAUT. L'administrateur peut les surcharger
// depuis l'onglet Configuration (table platform_config) ; les accesseurs en bas
// de ce fichier (getPlanDetails / getPaidBoostCost / …) fusionnent ces overrides
// sur les valeurs par défaut. Toujours utiliser ces accesseurs côté métier.
import { getRuntimeOverrides, type PlanOverride } from '../settings/runtime-config';

export const SubscriptionPlan = {
  STARTER:    'starter',
  BUSINESS:   'business',
  ENTREPRISE: 'entreprise',
} as const;

export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

// Type de compte professionnel — détermine les libellés et les limites spécifiques
export type ProfessionalAccountType =
  | 'professional_hebergement'
  | 'professional_hotel'
  | 'professional_immobilier'
  | 'restaurateur';

export interface PlanDetails {
  name: string;
  monthlyPrice: number;          // FCFA
  commissionRate: number;        // 0 pour toutes les formules v2
  freeBoostsPerMonth: number;
  boostDurationDays: number;
  includedPropertiesLimit: number; // limite générique (hébergement/immobilier)
  includedMenusLimit: number;      // limite pour restaurateurs (9999 = illimité)
  videoUpload: boolean;           // autoriser l'upload de vidéo
  virtualTour: boolean;           // visite 3D — Entreprise uniquement
  verifiedBadge: boolean;         // badge "Vérifié" — Business
  premiumBadge: boolean;          // badge "Premium" — Entreprise
  visibilityBoostPct: number;     // 0 / 30 / 100 (prioritaire)
  analytics: boolean;             // tableau de bord analytique avancé
  multiUser: boolean;             // gestion multi-utilisateurs (collaborateurs)
  monthlyReport: boolean;         // rapport PDF mensuel par email
  betaAccess: boolean;            // accès anticipé aux nouvelles fonctionnalités
  loyaltyProgram: boolean;        // programme de fidélité client — Entreprise
  features: string[];             // liste d'avantages affichée dans l'app
}

export const PLAN_DETAILS: Record<string, PlanDetails> = {
  starter: {
    name: 'Starter',
    monthlyPrice: 0,
    commissionRate: 0,
    freeBoostsPerMonth: 0,
    boostDurationDays: 0,
    includedPropertiesLimit: 3,
    includedMenusLimit: 3,
    videoUpload: false,
    virtualTour: false,
    verifiedBadge: false,
    premiumBadge: false,
    visibilityBoostPct: 0,
    analytics: false,
    multiUser: false,
    monthlyReport: false,
    betaAccess: false,
    loyaltyProgram: false,
    features: [
      '0 % commission sur toutes les réservations',
      'Jusqu\'à 3 publications',
      'Gestion des réservations de base',
      'Calendrier de disponibilité',
      'Messagerie intégrée avec les clients',
      'Paiements en ligne sécurisés',
      'Support par email (réponse sous 48h)',
      'Tableau de bord basique',
      'Calendrier synchronisé avec Google Calendar',
      'Possibilité de définir des périodes indisponibles',
    ],
  },

  business: {
    name: 'Business',
    monthlyPrice: 9_000,
    commissionRate: 0,
    freeBoostsPerMonth: 2,
    boostDurationDays: 3,
    includedPropertiesLimit: 10,
    includedMenusLimit: 10,
    videoUpload: true,
    virtualTour: false,
    verifiedBadge: true,
    premiumBadge: false,
    visibilityBoostPct: 30,
    analytics: true,
    multiUser: false,
    monthlyReport: false,
    betaAccess: true,
    loyaltyProgram: false,
    features: [
      '0 % commission sur toutes les réservations',
      'Jusqu\'à 10 publications',
      'Publication de vidéos',
      'Badge « Vérifié » sur les annonces',
      'Visibilité augmentée de 30 % dans les résultats',
      '2 boosts gratuits par mois (3 jours chacun)',
      'Tableau de bord analytique',
      'Support prioritaire par chat (réponse sous 12h)',
      'Calendrier de disponibilité',
      'Messagerie intégrée avec les clients',
      'Paiements en ligne sécurisés',
      'Calendrier synchronisé avec Google Calendar',
      'Possibilité de définir des périodes indisponibles',
      'Accès bêta aux nouvelles fonctionnalités',
    ],
  },

  entreprise: {
    name: 'Entreprise',
    monthlyPrice: 24_000,
    commissionRate: 0,
    freeBoostsPerMonth: 7,
    boostDurationDays: 3,
    includedPropertiesLimit: 40,
    includedMenusLimit: 9_999, // illimité pour les restaurateurs
    videoUpload: true,
    virtualTour: true,
    verifiedBadge: false,
    premiumBadge: true,
    visibilityBoostPct: 100, // prioritaire (en tête des résultats)
    analytics: true,
    multiUser: true,
    monthlyReport: true,
    betaAccess: true,
    loyaltyProgram: true,
    features: [
      '0 % commission sur toutes les réservations',
      'Jusqu\'à 40 publications (restaurants : illimité)',
      'Visite 3D immersive',
      'Publication de vidéos',
      'Badge « Premium » sur les annonces',
      'Visibilité prioritaire dans les résultats',
      '7 boosts gratuits par mois (3 jours chacun)',
      'Gestion multi-utilisateurs (collaborateurs)',
      'Support VIP 7j/7 (réponse sous 4h)',
      'Tableau de bord analytique',
      'Notifications par email',
      'Calendrier de disponibilité',
      'Messagerie intégrée avec les clients',
      'Paiements en ligne sécurisés',
      'Calendrier synchronisé avec Google Calendar',
      'Programme de fidélité client personnalisé',
      'Rapport mensuel personnalisé (PDF) par email',
      'Accès bêta aux nouvelles fonctionnalités',
    ],
  },
};

// Retourne la limite de publications selon le plan ET le type de compte
// (overrides admin pris en compte via getPlanDetails).
export function getPublicationLimit(planType: string, accountType: string): number {
  const plan = getPlanDetails(planType);
  if (!plan) return 3;
  return accountType === 'restaurateur' ? plan.includedMenusLimit : plan.includedPropertiesLimit;
}

// Libellé de "publication" adapté au type de compte
export function publicationLabel(accountType: string): string {
  return accountType === 'restaurateur' ? 'menu' : 'bien';
}

export const PAID_BOOST_COST_FCFA = 2_000;
export const PAID_BOOST_DURATION_DAYS = 3;

// Publication supplémentaire au-delà de la limite de la formule : 500 FCFA/mois.
export const EXTRA_PUBLICATION_SLOT_FCFA = 500;

// Limite effective = limite de la formule + slots supplémentaires achetés.
export function effectivePublicationLimit(
  planType: string,
  accountType: string,
  extraSlots = 0,
): number {
  return getPublicationLimit(planType, accountType) + Math.max(0, extraSlots);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESSEURS AVEC OVERRIDES ADMIN (platform_config) — à utiliser côté métier.
// Chaque accesseur retombe sur la constante par défaut si aucun override n'existe.
// ─────────────────────────────────────────────────────────────────────────────

// Champs de PlanDetails qu'un override admin peut remplacer.
const PLAN_OVERRIDE_KEYS = [
  'monthlyPrice', 'includedPropertiesLimit', 'includedMenusLimit', 'freeBoostsPerMonth',
  'boostDurationDays', 'videoUpload', 'virtualTour', 'verifiedBadge', 'premiumBadge',
  'analytics', 'multiUser', 'monthlyReport', 'loyaltyProgram', 'visibilityBoostPct',
] as const satisfies readonly (keyof PlanDetails & keyof PlanOverride)[];

// Détails de la formule, overrides admin fusionnés sur les valeurs par défaut.
export function getPlanDetails(planType: string): PlanDetails {
  const base = PLAN_DETAILS[planType];
  if (!base) return base;
  const { subscriptions, boosts } = getRuntimeOverrides();
  const planOv = subscriptions?.[planType];
  if (!planOv && !boosts) return base;

  const merged: PlanDetails = { ...base };
  if (planOv) {
    for (const k of PLAN_OVERRIDE_KEYS) {
      const v = planOv[k];
      if (v !== undefined && v !== null) (merged as unknown as Record<string, unknown>)[k] = v;
    }
  }
  // Les boosts gratuits / la durée peuvent aussi provenir de la section "boosts".
  if (boosts) {
    if (planType === 'business'   && typeof boosts.freeBoostsBusiness   === 'number') merged.freeBoostsPerMonth = boosts.freeBoostsBusiness;
    if (planType === 'entreprise' && typeof boosts.freeBoostsEntreprise === 'number') merged.freeBoostsPerMonth = boosts.freeBoostsEntreprise;
    if (planType === 'business'   && typeof boosts.freeDaysBusiness     === 'number') merged.boostDurationDays  = boosts.freeDaysBusiness;
    if (planType === 'entreprise' && typeof boosts.freeDaysEntreprise   === 'number') merged.boostDurationDays  = boosts.freeDaysEntreprise;
  }
  return merged;
}

// Une formule est active par défaut ; l'admin peut la désactiver (active=false).
export function isPlanActive(planType: string): boolean {
  return getRuntimeOverrides().subscriptions?.[planType]?.active !== false;
}

// Coût d'un boost payant (FCFA / période), override admin pris en compte.
export function getPaidBoostCost(): number {
  const v = getRuntimeOverrides().boosts?.pricePerThreeDays;
  return typeof v === 'number' && v >= 0 ? v : PAID_BOOST_COST_FCFA;
}

// Durée d'un boost payant (jours), override admin pris en compte.
export function getPaidBoostDuration(): number {
  const v = getRuntimeOverrides().boosts?.durationDays;
  return typeof v === 'number' && v > 0 ? v : PAID_BOOST_DURATION_DAYS;
}

// Délai de grâce abonnement (jours) — override admin, sinon valeur fournie.
export function getGraceDays(defaultDays: number): number {
  const v = getRuntimeOverrides().grace?.subscriptionGraceDays;
  return typeof v === 'number' && v > 0 ? v : defaultDays;
}

// Feature-toggle global (ex. virtualTourEnabled, referralEnabled…) — actif par défaut.
export function isFeatureEnabled(key: string, defaultEnabled = true): boolean {
  const v = getRuntimeOverrides().features?.[key];
  return typeof v === 'boolean' ? v : defaultEnabled;
}
