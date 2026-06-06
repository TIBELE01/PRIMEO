'use client';
import Link from 'next/link';
import { FileText, Tag, Mail, MessageCircle } from 'lucide-react';

const sections = [
  { href: '/website/blog/posts',      icon: FileText,       label: 'Articles',     desc: 'Créer, modifier et publier des articles de blog.' },
  { href: '/website/blog/categories', icon: Tag,            label: 'Catégories',   desc: 'Gérer les catégories pour organiser les articles.' },
  { href: '/website/blog/newsletter', icon: Mail,           label: 'Newsletter',   desc: 'Consulter et exporter la liste des abonnés newsletter.' },
  { href: '/website/blog/comments',   icon: MessageCircle,  label: 'Commentaires', desc: 'Modérer les commentaires en attente de validation.' },
];

export default function BlogHubPage() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <Link href="/website" className="text-sm text-blue-600 hover:underline mb-2 inline-block">← Site vitrine</Link>
        <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
        <p className="mt-1 text-gray-500">Gérez les articles, catégories, abonnés et commentaires du blog.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
