// Hook feature flags — récupère les flags depuis l'API et met en cache 60s
import { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '../services/api/client';

interface FeatureFlags {
  [key: string]: boolean;
}

interface CacheEntry {
  flags: FeatureFlags;
  fetchedAt: number;
}

// Cache module-level partagé entre toutes les instances du hook (évite les appels redondants)
let moduleCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000; // 60 secondes, aligné sur le cache backend

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(() => {
    if (moduleCache && Date.now() - moduleCache.fetchedAt < CACHE_TTL_MS) {
      return moduleCache.flags;
    }
    return {};
  });
  const [loading, setLoading] = useState<boolean>(
    !moduleCache || Date.now() - moduleCache.fetchedAt >= CACHE_TTL_MS,
  );

  const fetchFlags = useCallback(async () => {
    try {
      const { data } = await apiClient.get<Array<{ key: string; enabled: boolean }>>('/feature-flags');
      const map: FeatureFlags = {};
      for (const item of data) {
        map[item.key] = item.enabled;
      }
      moduleCache = { flags: map, fetchedAt: Date.now() };
      setFlags(map);
    } catch {
      // Silencieux — on conserve les valeurs actuelles (ou les défauts)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Rafraîchit uniquement si le cache est expiré ou absent
    if (!moduleCache || Date.now() - moduleCache.fetchedAt >= CACHE_TTL_MS) {
      fetchFlags();
    } else {
      setLoading(false);
    }
  }, [fetchFlags]);

  // Vérifie si un flag est actif (défaut : false si inconnu)
  const isEnabled = useCallback(
    (key: string): boolean => flags[key] ?? false,
    [flags],
  );

  // Invalide le cache et force un rechargement
  const refresh = useCallback(() => {
    moduleCache = null;
    setLoading(true);
    fetchFlags();
  }, [fetchFlags]);

  return { flags, loading, isEnabled, refresh };
}
