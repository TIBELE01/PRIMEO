'use client';
// Navigation « en cartes » des modules : chaque niveau (type de compte, puis statut) est une grille
// de cartes cliquables avec compteur ; le dernier niveau affiche la liste complète.
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusTone, toneDot } from '@/lib/status';

export interface HubCard {
  value: string;
  label: string;
  count?: number;
  description?: string;
  icon?: React.ReactNode;
  tone?: StatusTone;
}

const toneRing: Record<StatusTone, string> = {
  success: 'border-t-cta-500',
  warning: 'border-t-secondary-500',
  danger: 'border-t-danger-500',
  info: 'border-t-primary-500',
  default: 'border-t-gray-300',
};

export function HubCards({ cards, onSelect, loading }: { cards: HubCard[]; onSelect: (value: string) => void; loading?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onSelect(c.value)}
          className={cn(
            'group text-left rounded-2xl border border-gray-200 dark:border-gray-700 border-t-4 bg-white dark:bg-gray-800 p-5 shadow-card',
            'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-600/30',
            toneRing[c.tone ?? 'info'],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {c.icon && (
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">{c.icon}</span>
              )}
              <div>
                <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                  {c.tone && <span className={cn('h-2.5 w-2.5 rounded-full', toneDot[c.tone])} />}
                  {c.label}
                </p>
                {c.description && <p className="mt-0.5 text-xs text-gray-500">{c.description}</p>}
              </div>
            </div>
            <ChevronRight size={18} className="mt-1 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-600" />
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {loading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-700" /> : c.count !== undefined ? c.count.toLocaleString('fr-FR') : <span className="text-base font-medium text-primary-700">Ouvrir</span>}
          </p>
        </button>
      ))}
    </div>
  );
}

export interface Crumb { label: string; onClick?: () => void }

/** Fil d'Ariane du module : Utilisateurs › Clients › Actifs (chaque niveau est cliquable). */
export function HubCrumbs({ items }: { items: Crumb[] }) {
  if (items.length <= 1) return null; // racine : le titre de la page suffit
  return (
    <nav aria-label="Navigation du module" className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {c.onClick && !last
              ? <button type="button" onClick={c.onClick} className="font-medium text-primary-700 hover:underline dark:text-primary-300">{c.label}</button>
              : <span className={cn(last ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-500')}>{c.label}</span>}
            {!last && <ChevronRight size={14} className="text-gray-300" />}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Profondeur courante dans le parcours : index de la première clé de navigation sans valeur.
 * -1 = tous les niveaux sont choisis → afficher la liste.
 */
export function hubDepth(filters: Record<string, string>, keys: string[]): number {
  return keys.findIndex((k) => !filters[k]);
}

/** Valeur envoyée à l'API : « all » (carte « Tous ») équivaut à aucun filtre. */
export function stripAll(params: Record<string, string | number>, keys: string[]): Record<string, string | number> {
  const out = { ...params };
  keys.forEach((k) => { if (out[k] === 'all') delete out[k]; });
  return out;
}
