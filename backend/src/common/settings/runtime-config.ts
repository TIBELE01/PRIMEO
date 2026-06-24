// Cache mémoire des overrides de configuration plateforme (table platform_config)
// lus par le code métier (prix d'abonnement, boosts, délai de grâce, features).
//
// Ce module est une FEUILLE (aucune dépendance) pour éviter tout cycle d'import :
// il est alimenté par platform-settings.ts et lu par subscription-plans.ts.
//
// Tous les overrides sont OPTIONNELS : en leur absence, le code retombe sur les
// constantes par défaut (subscription-plans.ts). Le cache est rafraîchi au
// démarrage, périodiquement, et immédiatement après une sauvegarde admin.

export interface PlanOverride {
  monthlyPrice?: number;
  includedPropertiesLimit?: number;
  includedMenusLimit?: number;
  freeBoostsPerMonth?: number;
  boostDurationDays?: number;
  videoUpload?: boolean;
  virtualTour?: boolean;
  verifiedBadge?: boolean;
  premiumBadge?: boolean;
  analytics?: boolean;
  multiUser?: boolean;
  monthlyReport?: boolean;
  loyaltyProgram?: boolean;
  visibilityBoostPct?: number;
  active?: boolean; // formule activable/désactivable
}

export interface BoostsOverride {
  pricePerThreeDays?: number;
  durationDays?: number;
  freeBoostsBusiness?: number;
  freeBoostsEntreprise?: number;
  freeDaysBusiness?: number;
  freeDaysEntreprise?: number;
}

export interface RuntimeOverrides {
  subscriptions?: Record<string, PlanOverride>;
  boosts?: BoostsOverride;
  grace?: { subscriptionGraceDays?: number };
  features?: Record<string, boolean>;
}

let overrides: RuntimeOverrides = {};

export function setRuntimeOverrides(next: RuntimeOverrides | null | undefined): void {
  overrides = next ?? {};
}

export function getRuntimeOverrides(): RuntimeOverrides {
  return overrides;
}
