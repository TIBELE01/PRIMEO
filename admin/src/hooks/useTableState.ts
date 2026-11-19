'use client';
// État d'un tableau de données (onglets, filtres, recherche, tri, pagination) persistant :
// - reflété dans l'URL (lien partageable, survit au rafraîchissement) ;
// - mémorisé dans localStorage (retrouvé en revenant sur la page sans paramètres).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface TableState {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  search: string;
  filters: Record<string, string>;
}

interface Options {
  /** Clé unique de la page, utilisée pour localStorage */
  storageKey: string;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  defaultPageSize?: number;
  /** Filtres par défaut (ex. { status: 'pending' }) */
  defaultFilters?: Record<string, string>;
}

const PAGE_SIZES = [10, 20, 50, 100];
const RESERVED = ['page', 'size', 'sort', 'dir', 'q'];

function safeGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* stockage indisponible */ }
}

export function useTableState({
  storageKey,
  defaultSortKey = 'createdAt',
  defaultSortDir = 'desc',
  defaultPageSize = 20,
  defaultFilters = {},
}: Options) {
  const defaults = useRef<TableState>({
    page: 1, pageSize: defaultPageSize, sortKey: defaultSortKey, sortDir: defaultSortDir, search: '',
    filters: { ...defaultFilters },
  });
  const [state, setState] = useState<TableState>(defaults.current);
  // Les requêtes ne partent qu'une fois l'état restauré (évite un premier appel avec les mauvais filtres)
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const fromParams = (qs: URLSearchParams): TableState => {
      const filters: Record<string, string> = { ...defaults.current.filters };
      // les filtres connus sont ceux des défauts + tout paramètre non réservé
      qs.forEach((v, k) => { if (!RESERVED.includes(k)) filters[k] = v; });
      const size = parseInt(qs.get('size') ?? '', 10);
      return {
        page: Math.max(parseInt(qs.get('page') ?? '1', 10) || 1, 1),
        pageSize: PAGE_SIZES.includes(size) ? size : defaults.current.pageSize,
        sortKey: qs.get('sort') || defaults.current.sortKey,
        sortDir: qs.get('dir') === 'asc' ? 'asc' : qs.get('dir') === 'desc' ? 'desc' : defaults.current.sortDir,
        search: qs.get('q') ?? '',
        filters,
      };
    };
    const url = new URLSearchParams(window.location.search);
    let restored: URLSearchParams | null = null;
    if ([...url.keys()].length > 0) restored = url;
    else {
      const saved = safeGet(`primeo-admin:table:${storageKey}`);
      if (saved) restored = new URLSearchParams(saved);
    }
    if (restored) setState(fromParams(restored));
    setHydrated(true);
  }, [storageKey]);

  // Écriture dans l'URL + localStorage à chaque changement
  useEffect(() => {
    if (!hydrated) return;
    const qs = new URLSearchParams();
    if (state.page > 1) qs.set('page', String(state.page));
    if (state.pageSize !== defaults.current.pageSize) qs.set('size', String(state.pageSize));
    if (state.sortKey !== defaults.current.sortKey) qs.set('sort', state.sortKey);
    if (state.sortDir !== defaults.current.sortDir) qs.set('dir', state.sortDir);
    if (state.search) qs.set('q', state.search);
    Object.entries(state.filters).forEach(([k, v]) => { if (v) qs.set(k, v); });
    const str = qs.toString();
    safeSet(`primeo-admin:table:${storageKey}`, str);
    const next = `${window.location.pathname}${str ? `?${str}` : ''}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', next);
  }, [state, hydrated, storageKey]);

  const setFilter = useCallback((key: string, value: string) => {
    setState((s) => ({ ...s, page: 1, filters: { ...s.filters, [key]: value } }));
  }, []);
  const setFilters = useCallback((patch: Record<string, string>) => {
    setState((s) => ({ ...s, page: 1, filters: { ...s.filters, ...patch } }));
  }, []);
  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, page: 1, search })), []);
  const setPage = useCallback((page: number) => setState((s) => ({ ...s, page })), []);
  const setPageSize = useCallback((pageSize: number) => setState((s) => ({ ...s, page: 1, pageSize })), []);
  const setSort = useCallback((key: string) => {
    setState((s) => s.sortKey === key
      ? { ...s, page: 1, sortDir: s.sortDir === 'asc' ? 'desc' : 'asc' }
      : { ...s, page: 1, sortKey: key, sortDir: 'asc' });
  }, []);
  const reset = useCallback((keep: string[] = []) => {
    setState((s) => {
      const filters: Record<string, string> = { ...defaults.current.filters };
      keep.forEach((k) => { if (s.filters[k]) filters[k] = s.filters[k]!; });
      return { ...defaults.current, filters };
    });
  }, []);

  const activeFilterCount = useMemo(
    () => Object.entries(state.filters).filter(([k, v]) => v && v !== (defaults.current.filters[k] ?? '')).length + (state.search ? 1 : 0),
    [state.filters, state.search],
  );

  /** Paramètres prêts à envoyer à l'API (les valeurs vides sont omises) */
  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = {
      page: state.page, limit: state.pageSize, sortBy: state.sortKey, sortDir: state.sortDir,
    };
    if (state.search) p['search'] = state.search;
    Object.entries(state.filters).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  }, [state]);

  return { state, hydrated, queryParams, setFilter, setFilters, setSearch, setPage, setPageSize, setSort, reset, activeFilterCount };
}
