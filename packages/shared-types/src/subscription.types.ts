// Shared subscription types
export type SubscriptionPlan = 'essentiel' | 'prestige' | 'premium';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
}
