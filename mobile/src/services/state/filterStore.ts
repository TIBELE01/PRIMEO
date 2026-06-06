// filterStore: Zustand store for search filter state
import { create } from 'zustand';
import type { SearchParams } from '../../types/property';

interface FilterState {
  filters: Partial<SearchParams>;
  setFilter: <K extends keyof SearchParams>(key: K, value: SearchParams[K]) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>(set => ({
  filters: {},
  setFilter: (key, value) => set(s => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: {} }),
}));
