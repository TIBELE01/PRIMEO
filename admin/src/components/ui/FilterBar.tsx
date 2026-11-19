'use client';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  search: string;
  onSearch: (q: string) => void;
  placeholder?: string;
  activeCount?: number;
  onReset?: () => void;
  /** Filtres avancés (selects, dates, ville…) */
  children?: React.ReactNode;
}

/** Barre de recherche + filtres avancés, avec compteur de filtres actifs et réinitialisation. */
export function FilterBar({ search, onSearch, placeholder = 'Rechercher…', activeCount = 0, onReset, children }: Props) {
  const [text, setText] = useState(search);
  const debounced = useDebounce(text, 350);

  // Resynchronise le champ quand l'état est restauré (URL / localStorage) ou réinitialisé
  useEffect(() => { setText(search); }, [search]);
  useEffect(() => { if (debounced !== search) onSearch(debounced); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [debounced]);

  return (
    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-52">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="input pl-9 w-full"
        />
      </div>
      {children}
      {activeCount > 0 && onReset && (
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-danger-600">
          <X size={14} /> Réinitialiser ({activeCount})
        </button>
      )}
    </div>
  );
}
