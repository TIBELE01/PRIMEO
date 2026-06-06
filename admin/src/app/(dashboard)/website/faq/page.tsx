'use client';
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { websiteService } from '@/services/api';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';

type FaqItem = { id: number; category: string; question: string; answer: string; order: number; };
type FaqFormValues = { category: string; question: string; answer: string; order: number; };

export default function FaqPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [filterCat, setFilterCat] = useState('');

  const { data: items = [], isLoading } = useQuery<FaqItem[]>({
    queryKey: ['faq-admin'],
    queryFn: () => websiteService.listFaq(),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FaqFormValues>({
    defaultValues: { category: '', question: '', answer: '', order: 0 },
  });

  const categories = useMemo(() => Array.from(new Set(items.map(i => i.category))).sort(), [items]);

  const filtered = useMemo(() => filterCat ? items.filter(i => i.category === filterCat) : items, [items, filterCat]);

  const grouped = useMemo(() => {
    const map: Record<string, FaqItem[]> = {};
    filtered.forEach(item => { (map[item.category] ??= []).push(item); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const saveMut = useMutation({
    mutationFn: (d: FaqFormValues) =>
      editing
        ? websiteService.updateFaq(editing.id, d)
        : websiteService.createFaq({ ...d, order: Number(d.order) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faq-admin'] }); closeForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => websiteService.deleteFaq(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faq-admin'] }),
  });

  const moveMut = useMutation({
    mutationFn: ({ id, order }: { id: number; order: number }) => websiteService.updateFaq(id, { order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faq-admin'] }),
  });

  function openCreate() {
    setEditing(null);
    reset({ category: '', question: '', answer: '', order: items.length });
    setShowForm(true);
  }

  function openEdit(item: FaqItem) {
    setEditing(item);
    reset({ category: item.category, question: item.question, answer: item.answer, order: item.order });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditing(null); }

  function moveItem(item: FaqItem, dir: 'up' | 'down') {
    const siblings = items.filter(i => i.category === item.category).sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex(i => i.id === item.id);
    const target = dir === 'up' ? siblings[idx - 1] : siblings[idx + 1];
    if (!target) return;
    moveMut.mutate({ id: item.id, order: target.order });
    moveMut.mutate({ id: target.id, order: item.order });
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/website" className="text-sm text-blue-600 hover:underline mb-1 inline-block">← Site vitrine</Link>
          <h1 className="text-2xl font-bold text-gray-900">Centre d'aide — FAQ</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} question{items.length !== 1 ? 's' : ''} dans {categories.length} catégorie{categories.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Ajouter une FAQ
        </button>
      </div>

      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button onClick={() => setFilterCat('')} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!filterCat ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}>Toutes</button>
          {categories.map(c => (
            <button key={c} onClick={() => setFilterCat(c === filterCat ? '' : c)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterCat === c ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}>{c}</button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">Chargement…</div>
      ) : !grouped.length ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">Aucune FAQ. Cliquez sur "Ajouter une FAQ" pour commencer.</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, catItems]) => (
            <div key={cat} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">{cat}</h2>
                <span className="text-xs text-gray-400">{catItems.length} question{catItems.length !== 1 ? 's' : ''}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Ordre</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Question</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...catItems].sort((a, b) => a.order - b.order).map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 w-24">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 font-mono text-xs w-8 text-center">{item.order}</span>
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveItem(item, 'up')} disabled={[...catItems].sort((a,b)=>a.order-b.order)[0]?.id === item.id} className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={14} /></button>
                            <button onClick={() => moveItem(item, 'down')} disabled={[...catItems].sort((a,b)=>a.order-b.order).at(-1)?.id === item.id} className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={14} /></button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 line-clamp-1">{item.question}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.answer.replace(/<[^>]+>/g, '')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Pencil size={15} /></button>
                          <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(item.id); }} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closeForm} />
          <div className="w-full max-w-xl bg-white shadow-2xl overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Modifier la FAQ' : 'Nouvelle question'}</h2>
              <button onClick={closeForm} className="p-1.5 rounded hover:bg-gray-100"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit(d => saveMut.mutate(d))} className="p-6 flex flex-col gap-4 flex-1">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Catégorie *</label>
                <input list="cat-list" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ex: Abonnements & Paiements" {...register('category', { required: true })} />
                <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                {errors.category && <p className="text-xs text-red-600 mt-1">Catégorie requise</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Question *</label>
                <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Quelle est votre question ?" {...register('question', { required: true })} />
                {errors.question && <p className="text-xs text-red-600 mt-1">Question requise</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Réponse * <span className="font-normal text-gray-400">(HTML accepté)</span></label>
                <textarea rows={10} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" placeholder="<p>Votre réponse…</p>" {...register('answer', { required: true })} />
                {errors.answer && <p className="text-xs text-red-600 mt-1">Réponse requise</p>}
                <p className="text-xs text-gray-400 mt-1">Balises supportées : &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;a&gt;, &lt;br&gt;.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Ordre d'affichage</label>
                <input type="number" min={0} className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('order', { valueAsNumber: true })} />
              </div>
              {saveMut.isError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">Erreur lors de la sauvegarde.</p>}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-auto">
                <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saveMut.isPending} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saveMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
