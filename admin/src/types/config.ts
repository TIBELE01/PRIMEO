// Admin platform configuration types
export interface PlatformConfig {
  subscriptions: {
    starter: number;    // 0 FCFA/mois
    business: number;   // 9000 FCFA/mois
    entreprise: number; // 24000 FCFA/mois
  };
  boosts: {
    pricePerThreeDays: number;
    freeBoostsBusiness: number;    // 2 par mois, 3 jours
    freeBoostsEntreprise: number;  // 7 par mois, 3 jours
    freeDaysBusiness: number;      // 3
    freeDaysEntreprise: number;    // 3
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
