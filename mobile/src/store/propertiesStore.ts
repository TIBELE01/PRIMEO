// Properties search results and detail cache (Zustand)
import { create } from 'zustand';

export interface Property {
  id: string;
  name: string;
  type: string;
  city: string;
  pricePerNight: number | null;
  images: string[];
  rating: number;
  isBoosted: boolean;
}

interface PropertiesState {
  results: Property[];
  selectedProperty: Property | null;
  isLoading: boolean;
  setResults: (results: Property[]) => void;
  setSelected: (property: Property | null) => void;
  setLoading: (v: boolean) => void;
}

export const usePropertiesStore = create<PropertiesState>(set => ({
  results: [],
  selectedProperty: null,
  isLoading: false,
  setResults: results => set({ results }),
  setSelected: selectedProperty => set({ selectedProperty }),
  setLoading: isLoading => set({ isLoading }),
}));
