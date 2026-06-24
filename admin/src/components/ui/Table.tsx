'use client';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({ columns, data, keyExtractor, loading, emptyMessage = 'Aucune donnée', onRowClick }: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/40">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={cn('px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
          {loading ? (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Chargement…</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">{emptyMessage}</td></tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)} onClick={() => onRowClick?.(row)} className={cn('hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors', onRowClick && 'cursor-pointer')}>
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap', col.className)}>
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} / {totalPages}</span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="px-3 py-1 text-sm border dark:border-gray-600 dark:text-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">Précédent</button>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="px-3 py-1 text-sm border dark:border-gray-600 dark:text-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">Suivant</button>
      </div>
    </div>
  );
}
