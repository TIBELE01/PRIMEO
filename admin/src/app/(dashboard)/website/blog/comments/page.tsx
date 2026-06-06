'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { websiteService } from '@/services/api';
import { CheckCircle, Trash2 } from 'lucide-react';

type Comment = {
  id: string;
  postId: string;
  name: string;
  email: string;
  comment: string;
  status: string;
  createdAt: string;
  post?: { title: string; slug: string };
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function BlogCommentsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'pending' | 'approved' | ''>('pending');

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['blog-comments', status],
    queryFn: () => websiteService.listBlogComments(status || undefined),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => websiteService.approveComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-comments'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => websiteService.deleteComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-comments'] }),
  });

  const STATUS_LABELS: Record<string, string> = { pending: 'En attente', approved: 'Approuvé' };
  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/website/blog" className="text-sm text-blue-600 hover:underline mb-1 inline-block">← Blog</Link>
        <h1 className="text-2xl font-bold text-gray-900">Commentaires</h1>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {([['', 'Tous'], ['pending', 'En attente'], ['approved', 'Approuvés']] as [string, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setStatus(v as typeof status)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              status === v ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Chargement…</div>
        ) : !comments.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aucun commentaire.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {comments.map((c) => (
              <div key={c.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{c.name}</span>
                      <span className="text-gray-400 text-xs">{c.email}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                      <span className="text-gray-400 text-xs ml-auto">{formatDate(c.createdAt)}</span>
                    </div>
                    {c.post && (
                      <p className="text-xs text-blue-600 mb-1.5 truncate">Article : {c.post.title}</p>
                    )}
                    <p className="text-sm text-gray-700 leading-relaxed">{c.comment}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {c.status === 'pending' && (
                      <button
                        onClick={() => approveMut.mutate(c.id)}
                        disabled={approveMut.isPending}
                        className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600"
                        title="Approuver"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('Supprimer ce commentaire ?')) deleteMut.mutate(c.id); }}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
