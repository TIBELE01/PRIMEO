// Hook centralisé pour accéder aux données d'abonnement et aux feature flags
import { useState, useEffect, useCallback } from 'react';
import { subscriptionsApi } from '../services/api/endpoints/subscriptions';

export type PlanKey = 'starter' | 'business' | 'entreprise';

export interface SubscriptionInfo {
  planType: PlanKey;
  planName: string;
  monthlyPrice: number;
  status: string;
  includedPropertiesLimit: number;
  boostsFreeMonthly: number;
  boostsFreeUsedThisMonth: number;
  freeBoostsRemaining: number;
  videoUpload: boolean;
  virtualTour: boolean;
  verifiedBadge: boolean;
  premiumBadge: boolean;
  multiUser: boolean;
  monthlyReport: boolean;
  loyaltyProgram: boolean;
}

const PLAN_NAMES: Record<PlanKey, string> = {
  starter: 'Starter',
  business: 'Business',
  entreprise: 'Entreprise',
};

function normalizePlan(raw: string | undefined): PlanKey {
  const p = (raw ?? '').toLowerCase();
  if (p === 'entreprise' || p === 'premium') return 'entreprise';
  if (p === 'business' || p === 'prestige') return 'business';
  return 'starter';
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await subscriptionsApi.getMySubscription();
      const d = res.data?.data ?? res.data;
      if (!d) return;

      const planType = normalizePlan(d.planType ?? d.plan);
      const freeMonthly = d.boostsFreeMonthly ?? 0;
      const freeUsed = d.boostsFreeUsedThisMonth ?? 0;

      setSubscription({
        planType,
        planName: PLAN_NAMES[planType],
        monthlyPrice: d.monthlyPrice ?? d.monthlyCost ?? 0,
        status: d.status ?? 'active',
        includedPropertiesLimit: d.includedPropertiesLimit ?? 3,
        boostsFreeMonthly: freeMonthly,
        boostsFreeUsedThisMonth: freeUsed,
        freeBoostsRemaining: d.freeBoostsRemaining ?? Math.max(0, freeMonthly - freeUsed),
        videoUpload: d.videoUpload ?? planType !== 'starter',
        virtualTour: d.virtualTour ?? planType === 'entreprise',
        verifiedBadge: d.verifiedBadge ?? planType !== 'starter',
        premiumBadge: d.premiumBadge ?? planType === 'entreprise',
        multiUser: d.multiUser ?? planType === 'entreprise',
        monthlyReport: d.monthlyReport ?? planType === 'entreprise',
        loyaltyProgram: d.loyaltyProgram ?? planType === 'entreprise',
      });
    } catch {
      // Silencieux — l'écran affiche les données disponibles
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { subscription, loading, refresh };
}
