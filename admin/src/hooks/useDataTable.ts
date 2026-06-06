// useDataTable: pagination, sorting, filtering state for data tables
import { useState, useCallback } from 'react';

interface DataTableOptions {
  defaultPageSize?: number;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
}

export function useDataTable<TFilter extends object = Record<string, string>>(options: DataTableOptions = {}) {
  const { defaultPageSize = 20, defaultSortKey = 'createdAt', defaultSortDir = 'desc' } = options;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [totalPages, setTotalPages] = useState(1);
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [filters, setFilters] = useState<TFilter>({} as TFilter);
  const [search, setSearch] = useState('');

  const handleSort = useCallback((key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }, [sortKey]);

  const handleFilter = useCallback((keyOrFilters: string | Partial<TFilter>, value?: string) => {
    const newFilters = typeof keyOrFilters === 'string'
      ? { [keyOrFilters]: value } as unknown as Partial<TFilter>
      : keyOrFilters;
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => { setFilters({} as TFilter); setSearch(''); setPage(1); }, []);

  const handlePageChange = useCallback((p: number) => setPage(p), []);

  return {
    page, setPage, pageSize, setPageSize,
    totalPages, setTotalPages,
    sortKey, sortDir, handleSort,
    filters, handleFilter, resetFilters,
    search, handleSearch,
    handlePageChange,
    queryParams: { page, limit: pageSize, sortBy: sortKey, sortDir, search, ...filters },
  };
}
