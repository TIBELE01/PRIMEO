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
  analytics: 'Analytiques', reports: 'Rapports', cards: "Cartes de l'accueil", flags: 'Feature Flags',
  emails: 'Templates emails', admins: 'Comptes admin', website: 'Site vitrine', moderation: 'Modération',
  menus: 'Plats', withdrawals: 'Versements', communication: 'Communication', chatbot: 'Chatbot',
  content: 'Contenu des pages', hero: 'Hero', mission: 'Mission', why: 'Pourquoi Primeo', blog: 'Blog',
  careers: 'Carrières', about: 'À propos', faq: 'FAQ', messages: 'Messages', testimonials: 'Témoignages',
  partnerships: 'Partenariats', community: 'Communauté', posts: 'Articles', categories: 'Catégories',
  comments: 'Commentaires', newsletter: 'Newsletter', jobs: 'Offres d\'emploi', applications: 'Candidatures',
  team: 'Équipe', values: 'Valeurs', partners: 'Partenaires', history: 'Histoire', benefits: 'Avantages',
  presentation: 'Présentation',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
      <Link href="/dashboard" className="hover:text-primary-700"><Home size={14} /></Link>
      {parts.map((part, i) => {
        const href = '/' + parts.slice(0, i + 1).join('/');
        const isLast = i === parts.length - 1;
        // Les identifiants (UUID, cuid) ne sont pas des libellés : on les raccourcit
        const label = labels[part] ?? (part.length > 18 ? `${part.slice(0, 8)}…` : part);
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight size={14} />
            {isLast ? (
              <span className="text-gray-900 dark:text-gray-100 font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-primary-700">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
