'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { SortableList } from '@/components/ui/SortableList';
import { Plus, Trash2, ArrowLeft, Edit2, X, Check } from 'lucide-react';
import Link from 'next/link';

interface Value { id: string; icon: string; title: string; description: string; active: boolean; sortOrder: number; }
type ValueDraft = Pick<Value, 'icon' | 'title' | 'description'>;
const EMPTY: ValueDraft = { icon: '🌟', title: '', description: '' };

function ValueForm({ initial, onSave, onCancel }: { initial?: Partial<ValueDraft>; onSave: (d: ValueDraft) => void; onCancel: () => void; }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ValueDraft>({ defaultValues: { ...EMPTY, ...initial } });
  return (
    <form onSubmit={handleSubmit(onSave)} className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <input className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Icône" {...register('icon')} />
        <input className="col-span-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Titre *" {...register('title', { required: true })} />
        {errors.title && <span className="col-span-3 text-xs text-red-600">Titre requis</span>}
      </div>
      <textarea className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} placeholder="Description" {...register('description')} />
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"><Check size={14} /> Valider</button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><X size={14} /> Annuler</button>
      </div>
    </form>
  );
}

export default function AboutValuesPage() {
  const qc = useQueryClient();
  const { data: values = [], isLoading } = useQuery<Value[]>({ queryKey: ['about-values'], queryFn: websiteService.listAboutValues });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const createMut = useMutation({ mutationFn: (d: ValueDraft) => websiteService.createAboutValue(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['about-values'] }); setAdding(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<ValueDraft> }) => websiteService.updateAboutValue(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['about-values'] }); setEditId(null); } });
  const toggleMut = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => websiteService.updateAboutValue(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ['about-values'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => websiteService.deleteAboutValue(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['about-values'] }) });
  const reorderMut = useMutation({ mutationFn: (ids: string[]) => websiteService.reorderAboutValues(ids), onSuccess: () => qc.invalidateQueries({ queryKey: ['about-values'] }) });

  if (isLoading) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/website/about" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Valeurs</h1>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="space-y-3">
        {adding && <ValueForm onSave={d => createMut.mutate(d)} onCancel={() => setAdding(false)} />}

        <SortableList
          items={values}
          disabled={editId !== null || adding}
          onReorder={ids => reorderMut.mutate(ids)}
          renderItem={v => (
            <div className={`bg-white border rounded-xl p-4 ${!v.active ? 'opacity-50' : ''}`}>
              {editId === v.id ? (
                <ValueForm initial={v} onSave={d => updateMut.mutate({ id: v.id, d })} onCancel={() => setEditId(null)} />
              ) : (
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{v.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{v.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{v.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => toggleMut.mutate({ id: v.id, active: !v.active })} className={`px-2 py-1 rounded text-xs font-semibold ${v.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v.active ? 'Actif' : 'Masqué'}</button>
                    <button onClick={() => setEditId(v.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(v.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        />

        {values.length === 0 && !adding && (
          <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <p className="text-sm">Aucune valeur. Les données par défaut sont affichées sur le site.</p>
          </div>
        )}
      </div>
      {values.length > 0 && <p className="text-xs text-gray-400 mt-4">💡 Glissez-déposez pour réordonner.</p>}
    </div>
  );
}
