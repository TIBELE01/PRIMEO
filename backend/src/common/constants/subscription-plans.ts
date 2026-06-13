// Constantes des formules d'abonnement — Starter / Business / Entreprise
// Toutes les formules sont à 0% de commission depuis la v2.0.
// Les frais Genius Pay (paiement en ligne) sont déduits automatiquement par GP
// et ne sont pas imputés à Primeo.

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
export function getPublicationLimit(planType: string, accountType: string): number {
  const plan = PLAN_DETAILS[planType];
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
