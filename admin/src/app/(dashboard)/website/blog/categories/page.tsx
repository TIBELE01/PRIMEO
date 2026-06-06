'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { websiteService } from '@/services/api';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';

type Category = { id: string; name: string; slug: string };

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function BlogCategoriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '' });

  const { data: cats = [], isLoading } = useQuery<Category[]>({
    queryKey: ['blog-categories'],
    queryFn: () => websiteService.listBlogCategories(),
  });

  const saveMut = useMutation({
    mutationFn: (cat: Category | null) =>
      cat
        ? websiteService.updateBlogCategory(cat.id, { name: form.name, slug: form.slug })
        : websiteService.createBlogCategory({ name: form.name, slug: form.slug }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog-categories'] });
      closeForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => websiteService.deleteBlogCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-categories'] }),
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: '', slug: '' });
    setCreating(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug });
    setCreating(true);
  }

  function closeForm() { setCreating(false); setEditing(null); }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href="/website/blog" className="text-sm text-blue-600 hover:underline mb-1 inline-block">← Blog</Link>
          <h1 className="text-2xl font-bold text-gray-900">Catégories</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Nouvelle catégorie
        </button>
      </div>

      {/* Inline create/edit form */}
      {creating && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">{editing ? 'Modifier' : 'Nouvelle catégorie'}</h3>
          <div className="flex gap-3 flex-wrap">
            <input
              className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))}
            />
            <input
              className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="slug-url"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
            <button
              onClick={() => saveMut.mutate(editing)}
              disabled={saveMut.isPending || !form.name || !form.slug}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check size={14} /> {saveMut.isPending ? '…' : 'Enregistrer'}
            </button>
            <button onClick={closeForm} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-white flex items-center gap-1">
              <X size={14} /> Annuler
            </button>
          </div>
          {saveMut.isError && <p className="text-red-500 text-xs mt-2">Erreur lors de la sauvegarde.</p>}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Chargement…</div>
        ) : !cats.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aucune catégorie. Créez-en une ci-dessus.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Slug</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cats.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { if (confirm('Supprimer cette catégorie ?')) deleteMut.mutate(c.id); }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
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
    </div>
  );
}
