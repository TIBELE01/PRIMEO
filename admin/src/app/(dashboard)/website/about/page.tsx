'use client';
import Link from 'next/link';
import { BookOpen, Target, Heart, Users, Handshake, ArrowLeft } from 'lucide-react';

const sections = [
  { href: '/website/about/history',  icon: BookOpen,   label: 'Histoire',          desc: "Récit de la genèse de Primeo — éditeur de texte riche." },
  { href: '/website/about/mission',  icon: Target,     label: 'Mission',           desc: 'Texte de la mission administrable.' },
  { href: '/website/about/values',   icon: Heart,      label: 'Valeurs',           desc: '4 cartes de valeurs (icône, titre, description).' },
  { href: '/website/about/team',     icon: Users,      label: 'Équipe fondatrice', desc: 'Membres avec photo, nom, rôle et biographie.' },
  { href: '/website/about/partners', icon: Handshake,  label: 'Partenaires',       desc: 'Logos partenaires avec lien optionnel.' },
];

export default function AboutHubPage() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/website" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> Retour au site vitrine
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">À propos</h1>
        <p className="mt-1 text-gray-500">Administrez le contenu de la page À propos du site public.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Icon size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{label}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
