// Hook « secteurs activés » — lit GET /api/config/features et le garde en cache.
//
// - Valeur par défaut : tout activé (aucun écran ne se vide pendant le chargement
//   ou en cas de panne réseau ; le serveur refuse de toute façon les actions sur
//   un secteur désactivé).
// - Cache partagé entre tous les écrans, rafraîchi toutes les 30 s, au retour de
//   l'application au premier plan, et à la demande (tirer pour rafraîchir).
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { apiClient } from '../services/api/client';
import { ALL_SECTORS_ENABLED, parseSectorFlags, type SectorFlags } from '../utils/sectors';

const CACHE_TTL_MS = 30_000;

let cached: { flags: SectorFlags; fetchedAt: number } | null = null;
let inFlight: Promise<SectorFlags> | null = null;
const listeners = new Set<(flags: SectorFlags) => void>();

const isFresh = (): boolean => !!cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

/** Charge l'état des secteurs (une seule requête à la fois, partagée). */
export async function fetchSectorFlags(force = false): Promise<SectorFlags> {
  if (!force && cached && isFresh()) return cached.flags;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data } = await apiClient.get('/config/features');
      const flags = parseSectorFlags((data as { data?: unknown })?.data ?? data);
      cached = { flags, fetchedAt: Date.now() };
      listeners.forEach((notify) => notify(flags));
      return flags;
    } catch {
      // Panne réseau : on garde le dernier état connu, sinon tout activé
      return cached?.flags ?? ALL_SECTORS_ENABLED;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function useSectorFlags(): { sectors: SectorFlags; loading: boolean; refresh: () => Promise<SectorFlags> } {
  const [sectors, setSectors] = useState<SectorFlags>(cached?.flags ?? ALL_SECTORS_ENABLED);
  const [loading, setLoading] = useState<boolean>(!isFresh());

  useEffect(() => {
    let active = true;
    const notify = (flags: SectorFlags) => { if (active) setSectors(flags); };
    listeners.add(notify);

    fetchSectorFlags().then((flags) => {
      if (active) { setSectors(flags); setLoading(false); }
    });

    // Retour au premier plan : l'admin a pu basculer une carte entre-temps
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void fetchSectorFlags();
    });

    return () => {
      active = false;
      listeners.delete(notify);
      subscription.remove();
    };
  }, []);

  const refresh = useCallback(() => fetchSectorFlags(true), []);

  return { sectors, loading, refresh };
}

/** Réinitialise le cache (tests). */
export function _resetSectorFlagsCache(): void {
  cached = null;
  inFlight = null;
}
