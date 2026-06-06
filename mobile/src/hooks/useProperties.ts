// useProperties: search and filter properties from propertiesStore
import { useCallback } from 'react';
import { usePropertiesStore } from '../store/propertiesStore';
import { propertiesApi } from '../services/api/endpoints/properties';
import type { SearchParams } from '../types/property';

export const useProperties = () => {
  const results = usePropertiesStore(s => s.results);
  const isLoading = usePropertiesStore(s => s.isLoading);
  const setResults = usePropertiesStore(s => s.setResults);
  const setLoading = usePropertiesStore(s => s.setLoading);

  const search = useCallback(async (params: SearchParams) => {
    setLoading(true);
    try {
      const res = await propertiesApi.search(params as Record<string, unknown>);
      setResults(res.data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, isLoading, search };
};
