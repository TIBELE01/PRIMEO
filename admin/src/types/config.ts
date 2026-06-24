// Admin platform configuration types

// Réglages éditables d'une formule (fusionnés côté backend sur les valeurs par
// défaut via getPlanDetails). Tous optionnels à la lecture : un champ absent
// conserve la valeur par défaut du code.
export interface PlanConfig {
  monthlyPrice: number;             // FCFA / mois
  includedPropertiesLimit: number;  // limite publications (hébergement/immobilier)
  includedMenusLimit: number;       // limite pour restaurateurs (9999 = illimité)
  videoUpload: boolean;             // autoriser la vidéo
  virtualTour: boolean;             // autoriser la visite 3D
  active: boolean;                  // formule proposée aux professionnels
}

export interface PlatformConfig {
  subscriptions: {
    starter: PlanConfig;
    business: PlanConfig;
    entreprise: PlanConfig;
  };
  boosts: {
    pricePerThreeDays: number;     // prix d'un boost payant (FCFA)
    durationDays: number;          // durée d'un boost payant (jours) — 3 = 72h
    freeBoostsBusiness: number;    // 2 par mois
    freeBoostsEntreprise: number;  // 7 par mois
    freeDaysBusiness: number;      // durée des boosts gratuits Business (jours)
    freeDaysEntreprise: number;    // durée des boosts gratuits Entreprise (jours)
  };
  referrals: {
    rewardAmount: number;          // 2000 FCFA crédit
  };
  grace: {
    subscriptionGraceDays: number; // 7 jours après échec de paiement
  };
  features: {
    virtualTourEnabled: boolean;
    referralEnabled: boolean;
    restaurantEnabled: boolean;
    currencyConverterEnabled: boolean;
  };
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed' | 'percent' | 'fixed_amount';
  discountValue: number;
  minAmount?: number;
  maxUses?: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
  updatedAt: string;
}
