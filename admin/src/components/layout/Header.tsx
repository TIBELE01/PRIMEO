'use client';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/Button';
import { initials, cn } from '@/lib/utils';
import { Search, LogOut, Clock, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { useState, useEffect, useRef } from 'react';
import { SESSION_TIMEOUT_MS, STORAGE_KEYS } from '@/lib/cookies';

function useSessionCountdown() {
  const [remaining, setRemaining] = useState<number>(SESSION_TIMEOUT_MS);

  useEffect(() => {
    const tick = () => {
      const last = sessionStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
      if (!last) { setRemaining(SESSION_TIMEOUT_MS); return; }
      const elapsed = Date.now() - Number(last);
      setRemaining(Math.max(0, SESSION_TIMEOUT_MS - elapsed));
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const isWarning = remaining < 30 * 60 * 1000;
  const label = remaining === 0 ? 'Expiré' : hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;

  return { label, isWarning };
}

// Recherche globale : chaque destination ouvre la liste complète du module filtrée par le terme.
const SEARCH_TARGETS = [
  { label: 'Utilisateurs', path: '/users', base: 'role=all&status=all' },
  { label: 'Réservations', path: '/bookings', base: 'status=all' },
  { label: 'Propriétés', path: '/properties', base: 'sector=all&status=all' },
  { label: 'Litiges', path: '/disputes', base: 'status=all' },
  { label: 'Versements', path: '/withdrawals', base: 'status=all' },
  { label: 'Tickets de support', path: '/support/tickets', base: 'status=all' },
] as const;

export function Header() {
  const { admin, logout } = useAuthStore();
  const { globalSearch, setGlobalSearch, setMobileNav } = useAdminStore();
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const term = globalSearch.trim();

  // Raccourcis : Ctrl/⌘ + K ou « / » (hors champ de saisie) placent le curseur dans la recherche
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const runSearch = (index: number) => {
    const target = SEARCH_TARGETS[index];
    if (!target || !term) return;
    const url = `${target.path}?${target.base}&q=${encodeURIComponent(term)}`;
    if (window.location.pathname === target.path) {
      // Même page : on réécrit l'URL et on notifie le tableau (il relit l'URL sur « popstate »)
      window.history.pushState(null, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      router.push(url);
    }
    setGlobalSearch('');
    inputRef.current?.blur();
  };
  const { label: sessionLabel, isWarning } = useSessionCountdown();

  const handleLogout = () => {
    logout();
    authService.logout();
    router.push('/login');
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div className="flex items-center gap-2">
        {/* Hamburger — ouvre le tiroir de navigation (mobile/tablette) */}
        <button
          onClick={() => setMobileNav(true)}
          className="lg:hidden p-1.5 -ml-1 text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white rounded"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu size={22} />
        </button>
        <div className={`relative transition-all duration-200 ${searching ? 'w-44 sm:w-80' : 'w-40 sm:w-48'}`}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            placeholder="Rechercher…"
            aria-label="Recherche globale (Ctrl + K)"
            aria-controls="global-search-results"
            aria-expanded={searching && !!term}
            value={globalSearch}
            onChange={(e) => { setGlobalSearch(e.target.value); setActive(0); }}
            onFocus={() => setSearching(true)}
            // léger délai : laisse le clic sur une destination aboutir avant la fermeture
            onBlur={() => setTimeout(() => setSearching(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % SEARCH_TARGETS.length); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + SEARCH_TARGETS.length) % SEARCH_TARGETS.length); }
              else if (e.key === 'Enter') { e.preventDefault(); runSearch(active); }
              else if (e.key === 'Escape') { setGlobalSearch(''); inputRef.current?.blur(); }
            }}
            className="w-full pl-9 pr-14 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-100 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-600"
          />
          {!searching && (
            <kbd className="hidden lg:block absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-600 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 pointer-events-none">Ctrl K</kbd>
          )}
          {searching && term && (
            <ul id="global-search-results" role="listbox" className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
              {SEARCH_TARGETS.map((t, i) => (
                <li key={t.path} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => runSearch(i)}
                    className={cn('w-full text-left px-3 py-2 text-sm flex items-center gap-2', i === active ? 'bg-primary-50 dark:bg-gray-700 text-primary-700 dark:text-white' : 'text-gray-700 dark:text-gray-200')}
                  >
                    <Search size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate">« {term} » dans <strong>{t.label}</strong></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle />
        {/* Session countdown */}
        <div className={cn(
          'hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
          isWarning ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
        )}>
          <Clock size={12} />
          <span>Session : {sessionLabel}</span>
        </div>

        {/* Admin identity */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-700 text-white rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
            {admin ? initials(`${admin.firstName} ${admin.lastName}`) : 'A'}
          </div>
          {admin && (
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">{admin.firstName} {admin.lastName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{admin.role.replace(/_/g, ' ')}</p>
            </div>
          )}
        </div>

        <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut size={16} />}>
          Déconnexion
        </Button>
      </div>
    </header>
  );
}
