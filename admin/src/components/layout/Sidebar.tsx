'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAdminStore } from '@/store/adminStore';
import { useAuthStore } from '@/stores/authStore';
import type { AdminRole } from '@/types/user';
import {
  LayoutDashboard, Users, Building2, Calendar, AlertTriangle,
  Settings, FileText, LifeBuoy, BarChart3, ChevronLeft, ChevronRight, Globe, ShieldCheck, CreditCard,
  UtensilsCrossed,
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: AdminRole[];
  badgeKey?: 'pendingKyc' | 'pendingProperties' | 'pendingModeration' | 'openDisputes' | 'openTickets';
}

const ALL_ROLES: AdminRole[] = ['super_admin', 'moderateur', 'support', 'analyste'];

const nav: NavItem[] = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Tableau de bord', roles: ALL_ROLES },
  { href: '/moderation',    icon: ShieldCheck,     label: 'Modération',      roles: ['super_admin', 'moderateur'], badgeKey: 'pendingModeration' },
  { href: '/users',         icon: Users,           label: 'Utilisateurs',    roles: ['super_admin', 'moderateur', 'support'], badgeKey: 'pendingKyc' },
  { href: '/properties',    icon: Building2,       label: 'Propriétés',      roles: ['super_admin', 'moderateur'], badgeKey: 'pendingProperties' },
  { href: '/menus/pending', icon: UtensilsCrossed, label: 'Plats (modération)', roles: ['super_admin', 'moderateur'] },
  { href: '/bookings',      icon: Calendar,        label: 'Réservations',    roles: ['super_admin', 'moderateur'] },
  { href: '/disputes',       icon: AlertTriangle,   label: 'Litiges',         roles: ['super_admin', 'moderateur'], badgeKey: 'openDisputes' },
  { href: '/subscriptions',  icon: CreditCard,      label: 'Abonnements',     roles: ['super_admin', 'moderateur'] },
  { href: '/analytics',     icon: BarChart3,       label: 'Analytiques',     roles: ALL_ROLES },
  { href: '/configuration', icon: Settings,        label: 'Configuration',   roles: ['super_admin'] },
  { href: '/logs',          icon: FileText,        label: 'Journaux',        roles: ['super_admin', 'moderateur'] },
  { href: '/support',       icon: LifeBuoy,        label: 'Support',         roles: ['super_admin', 'moderateur', 'support'], badgeKey: 'openTickets' },
  { href: '/website',       icon: Globe,           label: 'Site vitrine',    roles: ['super_admin', 'moderateur'] },
];

const roleLabel: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  moderateur:  'Modérateur',
  support:     'Support',
  analyste:    'Analyste',
};

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, stats, mobileNavOpen, setMobileNav } = useAdminStore();
  const { admin } = useAuthStore();

  // Normalise role: handle uppercase, hyphen variants, unknown → super_admin fallback
  const rawRole = admin?.role as string | undefined;
  const normRole = rawRole?.toLowerCase().replace(/-/g, '_') as AdminRole | undefined;
  const role: AdminRole = (normRole && ALL_ROLES.includes(normRole)) ? normRole : (rawRole ? 'super_admin' : 'super_admin');

  const visibleNav = nav.filter(item => item.roles.includes(role));

  const getBadge = (key: NavItem['badgeKey']) => {
    if (!key || !stats) return 0;
    return stats[key] ?? 0;
  };

  return (
    <>
    {/* Overlay (mobile/tablette) — ferme le tiroir au tap en dehors */}
    {mobileNavOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={() => setMobileNav(false)}
        aria-hidden="true"
      />
    )}
    <aside className={cn(
      'flex flex-col bg-primary-900 text-white transition-transform duration-300 z-50',
      // Mobile : tiroir off-canvas plein écran à gauche
      'fixed inset-y-0 left-0 w-64',
      mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
      // Desktop : colonne statique, repliable
      'lg:static lg:translate-x-0 lg:shrink-0',
      sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
    )}>
      <div className="flex items-center justify-between px-4 py-5 border-b border-primary-800">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://res.cloudinary.com/dlnnxvepd/image/upload/c_pad,b_transparent,w_240,h_240/v1782345787/Logo_Primeo_1_gzcjq2.png" alt="Primeo" className="h-8 w-auto" />
            <p className="text-xs text-primary-400">Administration</p>
          </div>
        )}
        <button onClick={toggleSidebar} className="text-primary-300 hover:text-white p-1 rounded">
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ href, icon: Icon, label, badgeKey }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          const badgeCount = getBadge(badgeKey);
          return (
            <Link
              key={href}
              href={href}
              title={sidebarCollapsed ? label : undefined}
              onClick={() => setMobileNav(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors',
                active ? 'bg-primary-700 text-white' : 'text-primary-300 hover:bg-primary-800 hover:text-white',
              )}
            >
              <div className="relative shrink-0">
                <Icon size={18} />
                {sidebarCollapsed && badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-primary-900" />
                )}
              </div>
              {!sidebarCollapsed && <span className="flex-1">{label}</span>}
              {!sidebarCollapsed && badgeCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {!sidebarCollapsed && admin && (
        <div className="px-4 py-3 border-t border-primary-800">
          <p className="text-xs text-primary-400">Connecté en tant que</p>
          <p className="text-xs font-semibold text-primary-200 mt-0.5">{admin.firstName} {admin.lastName}</p>
          <p className="text-xs text-primary-400 mt-0.5">{roleLabel[role] ?? role}</p>
        </div>
      )}
    </aside>
    </>
  );
}
