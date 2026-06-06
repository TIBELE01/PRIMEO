// Chargement et mise en cache d'une propriété par son identifiant
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { propertiesApi } from '../../../../services/api/endpoints/properties';
import type { Property } from '../../../../types/property';
import { normalizeProperty } from '../../../../utils/normalizeProperty';
import { CATEGORY_LIST } from '../../Category/categoryConfig';

const CACHE_PREFIX = '@primeo_property_';

// Préfixes des IDs de propriétés démo (jamais présents dans l'API réelle)
const DEMO_PREFIXES = ['res-', 'hot-', 'imm-', 'rest-'];

function isDemoId(id: string): boolean {
  return DEMO_PREFIXES.some(prefix => id.startsWith(prefix));
}

// Complète les champs obligatoires absents des objets démo (owner, adresse, etc.)
function enrichDemoProperty(raw: Partial<Property>): Property {
  const NOW = new Date().toISOString();
  const bedrooms = raw.bedrooms ?? 2;
  const defaults: Partial<Property> = {
    description: `Découvrez ${raw.name ?? 'cette propriété'} — une adresse de choix en Côte d'Ivoire.`,
    address: raw.city ?? "Côte d'Ivoire",
    amenities: [],
    isPublished: true,
    isBoosted: false,
    maxGuests: bedrooms * 2,
    bathrooms: Math.max(1, Math.floor(bedrooms / 2)),
    pricePerNight: null,
    priceForSale: null,
    updatedAt: NOW,
    owner: {
      id: 'demo-owner',
      firstName: 'Primeo',
      lastName: 'Hôte',
      avatarUrl: null,
      isSuperHost: !!(raw as any).isSuperHost,
      memberSince: '2023-01-01',
      totalReviews: raw.reviewCount ?? 0,
      overallRating: raw.rating ?? 4.5,
    },
  };
  return normalizeProperty({ ...defaults, ...raw });
}

function findDemoProperty(propertyId: string): Property | null {
  for (const config of CATEGORY_LIST) {
    const found = (config.demo as unknown as Partial<Property>[]).find(p => p.id === propertyId);
    if (found) return enrichDemoProperty(found);
  }
  return null;
}

export const usePropertyDetail = (propertyId: string) => {
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setIsFromCache(false);

    // Propriétés démo : on charge directement sans appel réseau
    if (isDemoId(propertyId)) {
      const demo = findDemoProperty(propertyId);
      if (!cancelled) {
        if (demo) {
          setProperty(demo);
        } else {
          setError('Propriété introuvable');
        }
        setLoading(false);
      }
      return () => { cancelled = true; };
    }

    // Propriétés réelles : appel API avec repli sur le cache local
    propertiesApi.getById(propertyId)
      .then(res => {
        if (cancelled) return;
        // Le backend retourne la propriété directement (non enveloppée dans {data:…})
        const prop = normalizeProperty(res.data?.data ?? res.data);
        setProperty(prop);
        AsyncStorage.setItem(`${CACHE_PREFIX}${propertyId}`, JSON.stringify(prop)).catch(() => null);
      })
      .catch(async e => {
        if (cancelled) return;
        const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${propertyId}`).catch(() => null);
        if (cached) {
          setProperty(normalizeProperty(JSON.parse(cached)));
          setIsFromCache(true);
        } else {
          setError(e.response?.data?.message ?? 'Erreur de chargement');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [propertyId]);

  return { property, isLoading, error, isFromCache };
};
