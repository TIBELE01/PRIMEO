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
  // Fusionne la config persistée (renvoyée par GET /admin/config) sur les valeurs
  // par défaut, section par section : les clés non encore enregistrées en base
  // conservent leurs valeurs par défaut.
  hydrate: (raw: Record<string, unknown> | null | undefined) => void;
}

export const DEFAULT_CONFIG: PlatformConfig = {
  subscriptions: {
    starter:    { monthlyPrice: 0,     includedPropertiesLimit: 3,  includedMenusLimit: 3,    videoUpload: false, virtualTour: false, active: true },
    business:   { monthlyPrice: 9000,  includedPropertiesLimit: 10, includedMenusLimit: 10,   videoUpload: true,  virtualTour: false, active: true },
    entreprise: { monthlyPrice: 24000, includedPropertiesLimit: 40, includedMenusLimit: 9999, videoUpload: true,  virtualTour: true,  active: true },
  },
  boosts: { pricePerThreeDays: 2000, durationDays: 3, freeBoostsBusiness: 2, freeBoostsEntreprise: 7, freeDaysBusiness: 3, freeDaysEntreprise: 3 },
  referrals: { rewardAmount: 2000 },
  grace: { subscriptionGraceDays: 7 },
  features: { virtualTourEnabled: true, referralEnabled: true, restaurantEnabled: true, currencyConverterEnabled: true },
};

function mergeConfig(raw: Record<string, unknown> | null | undefined): PlatformConfig {
  const r = (raw ?? {}) as Partial<Record<keyof PlatformConfig, Record<string, unknown>>>;
  const merge = <K extends keyof PlatformConfig>(k: K): PlatformConfig[K] =>
    ({ ...DEFAULT_CONFIG[k], ...(r[k] ?? {}) }) as PlatformConfig[K];
  // `subscriptions` doit être fusionné EN PROFONDEUR (par formule) : une formule
  // partiellement enregistrée ne doit pas écraser les champs par défaut des autres.
  const rawSubs = (r.subscriptions ?? {}) as Record<string, Record<string, unknown>>;
  const mergePlan = (k: keyof PlatformConfig['subscriptions']) =>
    ({ ...DEFAULT_CONFIG.subscriptions[k], ...(rawSubs[k] ?? {}) }) as PlatformConfig['subscriptions'][typeof k];
  return {
    subscriptions: {
      starter:    mergePlan('starter'),
      business:   mergePlan('business'),
      entreprise: mergePlan('entreprise'),
    },
    boosts: merge('boosts'),
    referrals: merge('referrals'),
    grace: merge('grace'),
    features: merge('features'),
  };
}

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
  hydrate: (raw) => set({ config: mergeConfig(raw) }),
}));
