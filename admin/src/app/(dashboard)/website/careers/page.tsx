'use client';
import Link from 'next/link';
import { Users, Heart, Gift, HelpCircle, Briefcase, FileText, ArrowLeft } from 'lucide-react';

const sections = [
  { href: '/website/careers/presentation', icon: Users,      label: 'Présentation & Équipe', desc: 'Titre, textes intro et photo équipe de la page Carrières.' },
  { href: '/website/careers/values',       icon: Heart,      label: 'Valeurs',               desc: '4 cartes de valeurs (icône, titre, description).' },
  { href: '/website/careers/benefits',     icon: Gift,       label: 'Avantages',             desc: 'Accordéon des avantages employés (salaire, télétravail…).' },
  { href: '/website/careers/faq',          icon: HelpCircle, label: 'FAQ',                   desc: 'Questions fréquentes sur le recrutement.' },
  { href: '/website/careers/jobs',         icon: Briefcase,  label: 'Offres d\'emploi',      desc: 'CRUD des offres d\'emploi actives et archivées.' },
  { href: '/website/careers/applications', icon: FileText,   label: 'Candidatures',          desc: 'Candidatures spontanées reçues via le site.' },
];

export default function CareersHubPage() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/website" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> Retour au site vitrine
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Carrières</h1>
        <p className="mt-1 text-gray-500">Administrez le contenu de la page Carrières du site public.</p>
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
