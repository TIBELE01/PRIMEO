// Store Zustand du mode maintenance — alimenté par l'intercepteur API (503)
// et par la vérification au démarrage ; consommé par App.tsx pour afficher
// l'écran de maintenance par-dessus toute l'application.
import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../constants/config';

interface MaintenanceState {
  active: boolean;
  message: string | null;
  estimatedEnd: string | null; // ISO 8601
  activate: (message?: string | null, estimatedEnd?: string | null) => void;
  deactivate: () => void;
  /** Interroge GET /api/maintenance (route exemptée du 503) et met à jour l'état. */
  refresh: () => Promise<boolean>;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  active: false,
  message: null,
  estimatedEnd: null,

  activate: (message = null, estimatedEnd = null) =>
    set({ active: true, message, estimatedEnd }),

  deactivate: () => set({ active: false, message: null, estimatedEnd: null }),

  refresh: async () => {
    try {
      const { data } = await axios.get<{ enabled: boolean; message?: string; estimatedEnd?: string | null }>(
        `${API_URL}/api/maintenance`,
        { timeout: 8_000 },
      );
      if (data.enabled) {
        set({ active: true, message: data.message ?? null, estimatedEnd: data.estimatedEnd ?? null });
        return true;
      }
      set({ active: false, message: null, estimatedEnd: null });
      return false;
    } catch {
      // Réseau indisponible : ne pas activer l'écran de maintenance à tort
      return false;
    }
  },
}));
