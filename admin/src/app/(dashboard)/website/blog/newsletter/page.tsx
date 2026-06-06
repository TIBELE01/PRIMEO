'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { websiteService } from '@/services/api';
import { Trash2, Download } from 'lucide-react';

type Subscriber = { id: string; email: string; subscribedAt: string; confirmedAt: string | null };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NewsletterPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['newsletter', page],
    queryFn: () => websiteService.listNewsletterSubscribers(page, 50),
  });

  const subs: Subscriber[] = (data && data.subscribers) ? data.subscribers : (Array.isArray(data) ? data : []);
  const total: number = (data && data.total) ? data.total : subs.length;
  const totalPages = Math.ceil(total / 50) || 1;

  const deleteMut = useMutation({
    mutationFn: (id: string) => websiteService.deleteNewsletterSubscriber(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['newsletter'] }),
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/website/blog" className="text-sm text-blue-600 hover:underline mb-1 inline-block">← Blog</Link>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
          <p className="text-sm text-gray-500 mt-1">{total} abonné{total !== 1 ? 's' : ''}</p>
        </div>
        <a
          href={websiteService.exportNewsletterUrl()}
          download="newsletter-subscribers.csv"
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download size={16} /> Exporter CSV
        </a>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Chargement…</div>
        ) : !subs.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aucun abonné pour le moment.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Inscrit le</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Confirmé</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.email}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(s.subscribedAt)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {s.confirmedAt
                      ? <span className="text-green-600 font-medium text-xs">✓ {formatDate(s.confirmedAt)}</span>
                      : <span className="text-yellow-600 text-xs">En attente</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { if (confirm('Supprimer cet abonné ?')) deleteMut.mutate(s.id); }}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40">← Précédent</button>
          <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40">Suivant →</button>
        </div>
      )}
    </div>
  );
}
