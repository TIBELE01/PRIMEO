// useInfiniteScroll: manages paginated list data with load-more support
import { useState, useCallback } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetcher: (page: number) => Promise<{ data: T[]; hasNextPage: boolean }>;
}

export function useInfiniteScroll<T>({ fetcher }: UseInfiniteScrollOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasNextPage) return;
    setLoading(true);
    try {
      const result = await fetcher(page);
      setData(prev => [...prev, ...result.data]);
      setHasNextPage(result.hasNextPage);
      setPage(p => p + 1);
    } finally {
      setLoading(false);
    }
  }, [page, isLoading, hasNextPage, fetcher]);

  const reset = useCallback(() => { setData([]); setPage(1); setHasNextPage(true); }, []);

  return { data, isLoading, hasNextPage, loadMore, reset };
}
