'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const labels: Record<string, string> = {
  dashboard: 'Tableau de bord', users: 'Utilisateurs', kyc: 'KYC',
  properties: 'Propriétés', pending: 'En attente', bookings: 'Réservations',
  disputes: 'Litiges', configuration: 'Configuration', subscriptions: 'Abonnements',
  boosts: 'Boosts', promos: 'Codes promo', appearance: 'Apparence',
  logs: 'Journaux', support: 'Support', tickets: 'Tickets',
  analytics: 'Analytiques', reports: 'Rapports',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
      <Link href="/dashboard" className="hover:text-primary-700"><Home size={14} /></Link>
      {parts.map((part, i) => {
        const href = '/' + parts.slice(0, i + 1).join('/');
        const isLast = i === parts.length - 1;
        const label = labels[part] ?? part;
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight size={14} />
            {isLast ? (
              <span className="text-gray-900 font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-primary-700">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
