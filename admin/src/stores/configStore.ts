// Admin platform configuration Zustand store
import { create } from 'zustand';
import type { PlatformConfig, PromoCode } from '../types/config';

interface ConfigState {
  config: PlatformConfig | null;
  promoCodes: PromoCode[];
  isLoading: boolean;
  setConfig: (config: PlatformConfig) => void;
  setPromoCodes: (codes: PromoCode[]) => void;
  setLoading: (loading: boolean) => void;
  updateConfigKey: <K extends keyof PlatformConfig>(section: K, values: Partial<PlatformConfig[K]>) => void;
}

const DEFAULT_CONFIG: PlatformConfig = {
  subscriptions: { starter: 0, business: 9000, entreprise: 24000 },
  boosts: { pricePerThreeDays: 2000, freeBoostsBusiness: 2, freeBoostsEntreprise: 7, freeDaysBusiness: 3, freeDaysEntreprise: 3 },
  referrals: { rewardAmount: 2000 },
  grace: { subscriptionGraceDays: 7 },
  features: { virtualTourEnabled: true, referralEnabled: true, restaurantEnabled: true, currencyConverterEnabled: true },
};

export const useConfigStore = create<ConfigState>(set => ({
  config: DEFAULT_CONFIG,
  promoCodes: [],
  isLoading: false,
  setConfig: (config) => set({ config }),
  setPromoCodes: (promoCodes) => set({ promoCodes }),
  setLoading: (isLoading) => set({ isLoading }),
  updateConfigKey: (section, values) =>
    set(state => ({
      config: state.config ? { ...state.config, [section]: { ...state.config[section], ...values } } : state.config,
    })),
}));
