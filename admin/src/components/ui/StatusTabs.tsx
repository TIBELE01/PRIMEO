'use client';
import { cn } from '@/lib/utils';
import { StatusTone, toneDot } from '@/lib/status';

export interface TabItem {
  value: string;
  label: string;
  count?: number;
  tone?: StatusTone;
}

interface Props {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** 'underline' (type de compte / sections) ou 'pills' (statuts) */
  variant?: 'underline' | 'pills';
  className?: string;
}

/** Onglets avec compteurs — utilisés pour le type de compte et le statut. */
export function StatusTabs({ tabs, value, onChange, variant = 'pills', className }: Props) {
  if (variant === 'underline') {
    return (
      <div role="tablist" className={cn('flex flex-wrap gap-x-1 border-b border-gray-200 dark:border-gray-700', className)}>
        {tabs.map((t) => {
          const active = t.value === value;
          return (
            <button
              key={t.value || 'all'}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={cn(
                'px-3.5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
                active
                  ? 'border-primary-600 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300',
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn('ml-2 rounded-full px-2 py-0.5 text-xs', active ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                  {t.count.toLocaleString('fr-FR')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div role="tablist" className={cn('flex flex-wrap gap-2', className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value || 'all'}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all',
              active
                ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100 shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400',
            )}
          >
            {t.tone && <span className={cn('h-2 w-2 rounded-full', toneDot[t.tone])} />}
            {t.label}
            {t.count !== undefined && <span className={cn('text-xs tabular-nums', active ? 'opacity-80' : 'text-gray-400')}>{t.count.toLocaleString('fr-FR')}</span>}
          </button>
        );
      })}
    </div>
  );
}
