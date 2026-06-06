'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { websiteService } from '@/services/api';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Pencil, Trash2, Plus, Upload, Eye, X, Check } from 'lucide-react';

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentHtml: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
  author: string;
  readingTime: number;
  status: string;
  categories: { category: { id: string; name: string; slug: string } }[];
};

type Category = { id: string; name: string; slug: string };

const EMPTY: Omit<Post, 'id' | 'coverImageUrl' | 'publishedAt' | 'categories'> = {
  title: '', slug: '', excerpt: '', contentHtml: '', author: 'Équipe Primeo', readingTime: 5, status: 'draft',
};

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BlogPostsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [catIds, setCatIds] = useState<string[]>([]);
  const [publishNow, setPublishNow] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['blog-posts', page, search],
    queryFn: () => websiteService.listBlogPosts(page, 20, search),
  });

  const { data: cats = [] } = useQuery<Category[]>({
    queryKey: ['blog-categories'],
    queryFn: () => websiteService.listBlogCategories(),
  });

  const posts: Post[] = (data && data.posts) ? data.posts : (Array.isArray(data) ? data : []);
  const total: number = (data && data.total) ? data.total : posts.length;
  const totalPages = Math.ceil(total / 20) || 1;

  const saveMut = useMutation({
    mutationFn: (p: Post | null) => {
      const body = {
        ...form,
        publishedAt: publishNow ? new Date().toISOString() : (p?.publishedAt ?? null),
        categoryIds: catIds,
      };
      return p ? websiteService.updateBlogPost(p.id, body) : websiteService.createBlogPost(body);
    },
    onSuccess: async (saved: any) => {
      if (coverFile && saved?.id) {
        setUploadingCover(true);
        try { await websiteService.uploadBlogCover(saved.id, coverFile); } finally { setUploadingCover(false); }
      }
      qc.invalidateQueries({ queryKey: ['blog-posts'] });
      closeForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => websiteService.deleteBlogPost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-posts'] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setCatIds([]);
    setPublishNow(false);
    setCoverFile(null);
    setShowForm(true);
  }

  function openEdit(p: Post) {
    setEditing(p);
    setForm({ title: p.title, slug: p.slug, excerpt: p.excerpt ?? '', contentHtml: p.contentHtml, author: p.author, readingTime: p.readingTime, status: p.status });
    setCatIds(p.categories.map((pc) => pc.category.id));
    setPublishNow(false);
    setCoverFile(null);
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditing(null); }

  function toggleCat(id: string) {
    setCatIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  const STATUS_LABELS: Record<string, string> = { draft: 'Brouillon', published: 'Publié', archived: 'Archivé' };
  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/website/blog" className="text-sm text-blue-600 hover:underline mb-1 inline-block">← Blog</Link>
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Nouvel article
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Rechercher un article…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Chargement…</div>
        ) : !posts.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aucun article.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Titre</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Publié</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Auteur</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 line-clamp-1">{p.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatDate(p.publishedAt)}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{p.author}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <a
                        href={`https://primeo.ci/blog/article.html?slug=${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        title="Voir"
                      >
                        <Eye size={15} />
                      </a>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Modifier">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { if (confirm('Supprimer cet article ?')) deleteMut.mutate(p.id); }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40">← Précédent</button>
          <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40">Suivant →</button>
        </div>
      )}

      {/* Slide-over form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closeForm} />
          <div className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Modifier l\'article' : 'Nouvel article'}</h2>
              <button onClick={closeForm} className="p-1.5 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="p-6 flex flex-col gap-4 flex-1">
              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Titre *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))}
                  placeholder="Titre de l'article"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Slug *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="mon-article-url"
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Extrait</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.excerpt ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Résumé court de l'article…"
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Contenu *</label>
                <RichTextEditor
                  value={form.contentHtml}
                  onChange={(html) => setForm((f) => ({ ...f, contentHtml: html }))}
                  placeholder="Rédigez le contenu de l'article…"
                />
              </div>

              {/* Author + reading time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Auteur</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.author}
                    onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Temps de lecture (min)</label>
                  <input
                    type="number" min={1}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.readingTime}
                    onChange={(e) => setForm((f) => ({ ...f, readingTime: parseInt(e.target.value) || 5 }))}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Statut</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>

              {/* Categories */}
              {cats.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Catégories</label>
                  <div className="flex flex-wrap gap-2">
                    {cats.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCat(c.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          catIds.includes(c.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        {catIds.includes(c.id) && <Check size={11} />}
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Publish now */}
              {form.status === 'published' && !editing?.publishedAt && (
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="rounded" />
                  Définir la date de publication à maintenant
                </label>
              )}

              {/* Cover image */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Image de couverture</label>
                {editing?.coverImageUrl && !coverFile && (
                  <img src={editing.coverImageUrl} alt="Cover" className="w-full h-40 object-cover rounded-lg mb-2" />
                )}
                {coverFile && (
                  <img src={URL.createObjectURL(coverFile)} alt="Aperçu" className="w-full h-40 object-cover rounded-lg mb-2" />
                )}
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-500">
                  <Upload size={15} />
                  {coverFile ? coverFile.name : 'Choisir une image'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={closeForm} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
              <button
                onClick={() => saveMut.mutate(editing)}
                disabled={saveMut.isPending || uploadingCover || !form.title || !form.slug}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saveMut.isPending || uploadingCover ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
