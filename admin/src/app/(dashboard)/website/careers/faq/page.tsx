'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { SortableList } from '@/components/ui/SortableList';
import { Plus, Trash2, ArrowLeft, Edit2, X, Check } from 'lucide-react';
import Link from 'next/link';

interface FaqItem { id: string; question: string; answer: string; active: boolean; sortOrder: number; }
type FaqDraft = Pick<FaqItem, 'question' | 'answer'>;
const EMPTY: FaqDraft = { question: '', answer: '' };

function FaqForm({ initial, onSave, onCancel }: { initial?: Partial<FaqDraft>; onSave: (d: FaqDraft) => void; onCancel: () => void; }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FaqDraft>({ defaultValues: { ...EMPTY, ...initial } });
  return (
    <form onSubmit={handleSubmit(onSave)} className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <div>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Question *" {...register('question', { required: true })} />
        {errors.question && <span className="text-xs text-red-600">Question requise</span>}
      </div>
      <textarea className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={4} placeholder="Réponse *" {...register('answer', { required: true })} />
      {errors.answer && <span className="text-xs text-red-600">Réponse requise</span>}
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"><Check size={14} /> Valider</button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><X size={14} /> Annuler</button>
      </div>
    </form>
  );
}

export default function CareersFaqPage() {
  const qc = useQueryClient();
  const { data: faqs = [], isLoading } = useQuery<FaqItem[]>({ queryKey: ['careers-faq'], queryFn: websiteService.listCareersFaq });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const createMut = useMutation({ mutationFn: (d: FaqDraft) => websiteService.createCareersFaq(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['careers-faq'] }); setAdding(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<FaqDraft> }) => websiteService.updateCareersFaq(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['careers-faq'] }); setEditId(null); } });
  const toggleMut = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => websiteService.updateCareersFaq(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ['careers-faq'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => websiteService.deleteCareersFaq(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['careers-faq'] }) });
  const reorderMut = useMutation({ mutationFn: (ids: string[]) => websiteService.reorderCareersFaq(ids), onSuccess: () => qc.invalidateQueries({ queryKey: ['careers-faq'] }) });

  if (isLoading) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/website/careers" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-bold text-gray-900">FAQ Recrutement</h1>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="space-y-3">
        {adding && <FaqForm onSave={d => createMut.mutate(d)} onCancel={() => setAdding(false)} />}

        <SortableList
          items={faqs}
          disabled={editId !== null || adding}
          onReorder={ids => reorderMut.mutate(ids)}
          renderItem={f => (
            <div className={`bg-white border rounded-xl p-4 ${!f.active ? 'opacity-50' : ''}`}>
              {editId === f.id ? (
                <FaqForm initial={f} onSave={d => updateMut.mutate({ id: f.id, d })} onCancel={() => setEditId(null)} />
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{f.question}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-line">{f.answer}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => toggleMut.mutate({ id: f.id, active: !f.active })} className={`px-2 py-1 rounded text-xs font-semibold ${f.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{f.active ? 'Actif' : 'Masqué'}</button>
                    <button onClick={() => setEditId(f.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(f.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        />

        {faqs.length === 0 && !adding && (
          <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <p className="text-sm">Aucune question. Les données par défaut sont affichées sur le site.</p>
          </div>
        )}
      </div>
      {faqs.length > 0 && <p className="text-xs text-gray-400 mt-4">💡 Glissez-déposez pour réordonner.</p>}
    </div>
  );
}
