// Currency conversion state — selected currency and exchange rates (Zustand)
import { create } from 'zustand';

interface CurrencyState {
  selectedCurrency: string;
  rates: Record<string, number>;
  lastUpdated: string | null;
  setCurrency: (currency: string) => void;
  setRates: (rates: Record<string, number>, lastUpdated: string) => void;
  convert: (amountXof: number) => number;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  selectedCurrency: 'FCFA',
  rates: {},
  lastUpdated: null,
  setCurrency: selectedCurrency => set({ selectedCurrency }),
  setRates: (rates, lastUpdated) => set({ rates, lastUpdated }),
  convert: amountXof => {
    const { selectedCurrency, rates } = get();
    if (selectedCurrency === 'FCFA') return amountXof;
    const rate = rates[selectedCurrency];
    return rate ? Math.round(amountXof * rate * 100) / 100 : amountXof;
  },
}));
