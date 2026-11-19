'use client';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Colonne triable : `key` (ou `sortKey`) est envoyé à l'API */
  sortable?: boolean;
  sortKey?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  // Tri (côté serveur)
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  // Sélection multiple
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  /** Liseré coloré à gauche de la ligne (repérage visuel du statut) */
  rowAccent?: (row: T) => string | undefined;
}

export function Table<T>({
  columns, data, keyExtractor, loading, emptyMessage = 'Aucune donnée', onRowClick,
  sortKey, sortDir, onSort, selectable, selectedIds, onSelectionChange, rowAccent,
}: TableProps<T>) {
  const selected = selectedIds ?? new Set<string>();
  const ids = data.map(keyExtractor);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = !allSelected && ids.some((id) => selected.has(id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    onSelectionChange?.(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange?.(next);
  };
  const colSpan = columns.length + (selectable ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/40">
          <tr>
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
            )}
            {columns.map((col) => {
              const sk = col.sortKey ?? col.key;
              const active = col.sortable && sortKey === sk;
              return (
                <th
                  key={col.key}
                  aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn('px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap', col.className)}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(sk)}
                      className={cn('inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 dark:hover:text-gray-100', active && 'text-primary-700 dark:text-primary-300')}
                    >
                      {col.header}
                      {active ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
                    </button>
                  ) : col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                <td colSpan={colSpan} className="px-4 py-3"><div className="h-5 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" /></td>
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr><td colSpan={colSpan} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">{emptyMessage}</td></tr>
          ) : (
            data.map((row) => {
              const id = keyExtractor(row);
              const isSel = selected.has(id);
              const accent = rowAccent?.(row);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                    onRowClick && 'cursor-pointer',
                    isSel && 'bg-primary-50/60 dark:bg-primary-900/20',
                  )}
                >
                  {selectable && (
                    <td className={cn('w-10 px-4 py-3 border-l-4', accent ?? 'border-l-transparent')} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label="Sélectionner la ligne"
                        checked={isSel}
                        onChange={() => toggleOne(id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap',
                        !selectable && i === 0 && 'border-l-4',
                        !selectable && i === 0 && (accent ?? 'border-l-transparent'),
                        col.className,
                      )}
                    >
                      {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total?: number;
  pageSize?: number;
  onPageSizeChange?: (n: number) => void;
}

function pageWindow(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) out.push('…');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < totalPages - 1) out.push('…');
  out.push(totalPages);
  return out;
}

export function Pagination({ page, totalPages, onPageChange, total, pageSize, onPageSizeChange }: PaginationProps) {
  const pages = Math.max(totalPages, 1);
  const from = total !== undefined && pageSize ? (total === 0 ? 0 : (page - 1) * pageSize + 1) : null;
  const to = total !== undefined && pageSize ? Math.min(page * pageSize, total) : null;
  const btn = 'inline-flex items-center justify-center min-w-8 h-8 px-2 text-sm border rounded-md dark:border-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
        {from !== null && to !== null
          ? <span>{from}–{to} sur {total!.toLocaleString('fr-FR')}</span>
          : <span>Page {page} / {pages}</span>}
        {onPageSizeChange && pageSize && (
          <label className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Lignes</span>
            <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="input !py-1 !w-auto text-sm">
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={btn} aria-label="Page précédente"><ChevronLeft size={14} /></button>
        {pageWindow(page, pages).map((p, i) => p === '…'
          ? <span key={`e${i}`} className="px-1 text-gray-400">…</span>
          : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`${btn} ${p === page ? '!bg-primary-600 !text-white !border-primary-600 hover:!bg-primary-700' : ''}`}
            >{p}</button>
          ))}
        <button disabled={page >= pages} onClick={() => onPageChange(page + 1)} className={btn} aria-label="Page suivante"><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}
