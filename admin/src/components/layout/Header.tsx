'use client';
import { useAuthStore } from '@/stores/authStore';
import { useAdminStore } from '@/store/adminStore';
import { Button } from '@/components/ui/Button';
import { initials, cn } from '@/lib/utils';
import { Search, LogOut, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { useState, useEffect } from 'react';
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

export function Header() {
  const { admin, logout } = useAuthStore();
  const { globalSearch, setGlobalSearch } = useAdminStore();
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const { label: sessionLabel, isWarning } = useSessionCountdown();

  const handleLogout = () => {
    logout();
    authService.logout();
    router.push('/login');
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 shrink-0">
      <div className={`relative transition-all duration-200 ${searching ? 'w-80' : 'w-48'}`}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Rechercher…"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          onFocus={() => setSearching(true)}
          onBlur={() => setSearching(false)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Session countdown */}
        <div className={cn(
          'hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
          isWarning ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500',
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
              <p className="text-sm font-medium text-gray-900 leading-tight">{admin.firstName} {admin.lastName}</p>
              <p className="text-xs text-gray-500 capitalize">{admin.role.replace(/_/g, ' ')}</p>
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
