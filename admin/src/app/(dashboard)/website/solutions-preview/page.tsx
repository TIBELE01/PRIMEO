'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { SortableList } from '@/components/ui/SortableList';
import { Plus, Trash2, ArrowLeft, Edit2, X, Check } from 'lucide-react';
import Link from 'next/link';

interface SolCard { id: string; title: string; summary: string; icon: string; link: string; active: boolean; sortOrder: number; }
interface SolFormValues { title: string; summary: string; icon: string; link: string; }

function SolForm({ initial, onSave, onCancel }: { initial?: Partial<SolCard>; onSave: (d: SolFormValues) => void; onCancel: () => void; }) {
  const { register, handleSubmit, formState: { errors } } = useForm<SolFormValues>({
    defaultValues: { title: initial?.title || '', summary: initial?.summary || '', icon: initial?.icon || '🏠', link: initial?.link || '/solutions/' },
  });
  return (
    <form onSubmit={handleSubmit(onSave)} className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600">Titre</label>
          <input className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Voyageurs" {...register('title', { required: true })} />
          {errors.title && <span className="text-xs text-red-600">Titre requis</span>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Icône (emoji)</label>
          <input className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="✈️" {...register('icon')} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600">Résumé</label>
        <textarea className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} {...register('summary', { required: true })} />
        {errors.summary && <span className="text-xs text-red-600">Résumé requis</span>}
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600">Lien</label>
        <input className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('link')} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"><Check size={14}/> Valider</button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><X size={14}/> Annuler</button>
      </div>
    </form>
  );
}

export default function SolutionsPreviewPage() {
  const qc = useQueryClient();
  const { data: cards = [], isLoading } = useQuery<SolCard[]>({ queryKey: ['website-solutions'], queryFn: () => websiteService.listSolutions() });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const createMut = useMutation({ mutationFn: (d: SolFormValues) => websiteService.createSolution(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['website-solutions'] }); setAdding(false); }});
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: object }) => websiteService.updateSolution(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['website-solutions'] }); setEditId(null); }});
  const deleteMut = useMutation({ mutationFn: (id: string) => websiteService.deleteSolution(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['website-solutions'] })});
  const toggleMut = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => websiteService.updateSolution(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ['website-solutions'] })});
  const reorderMut = useMutation({ mutationFn: (ids: string[]) => websiteService.reorderSolutions(ids), onSuccess: () => qc.invalidateQueries({ queryKey: ['website-solutions'] })});

  if (isLoading) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/website" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Solutions (aperçu accueil)</h1>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="space-y-3">
        {adding && <SolForm onSave={d => createMut.mutate(d)} onCancel={() => setAdding(false)} />}

        <SortableList
          items={cards}
          disabled={editId !== null || adding}
          onReorder={ids => reorderMut.mutate(ids)}
          renderItem={card => (
            <div className={`bg-white border rounded-xl p-4 ${!card.active ? 'opacity-50' : ''}`}>
              {editId === card.id ? (
                <SolForm initial={card} onSave={d => updateMut.mutate({ id: card.id, d })} onCancel={() => setEditId(null)} />
              ) : (
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{card.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{card.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{card.summary}</div>
                    <div className="text-xs text-blue-500 mt-1">{card.link}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => toggleMut.mutate({ id: card.id, active: !card.active })} className={`px-2 py-1 rounded text-xs font-semibold ${card.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {card.active ? 'Actif' : 'Masqué'}
                    </button>
                    <button onClick={() => setEditId(card.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 size={14}/></button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(card.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={14}/></button>
                  </div>
                </div>
              )}
            </div>
          )}
        />

        {cards.length === 0 && !adding && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Aucune carte. Les valeurs par défaut sont affichées.</p>
          </div>
        )}
      </div>
    </div>
  );
}
