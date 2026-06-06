'use client';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { SortableList } from '@/components/ui/SortableList';
import { Plus, Trash2, ArrowLeft, Edit2, X, Check, Upload } from 'lucide-react';
import Link from 'next/link';

interface ProdCard { id: string; title: string; description: string; imageUrl?: string; badge?: string; link: string; active: boolean; sortOrder: number; }
interface ProdFormValues { title: string; description: string; badge: string; link: string; }

function ProdForm({ initial, onSave, onCancel }: { initial?: Partial<ProdCard>; onSave: (d: ProdFormValues) => void; onCancel: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProdFormValues>({
    defaultValues: { title: initial?.title || '', description: initial?.description || '', badge: initial?.badge || '', link: initial?.link || '/produits/' },
  });
  return (
    <form onSubmit={handleSubmit(onSave)} className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600">Titre</label>
          <input className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('title', { required: true })} />
          {errors.title && <span className="text-xs text-red-600">Titre requis</span>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Badge (optionnel)</label>
          <input className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nouveau, Populaire…" {...register('badge')} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600">Description</label>
        <textarea className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} {...register('description', { required: true })} />
        {errors.description && <span className="text-xs text-red-600">Description requise</span>}
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600">Lien</label>
        <input className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('link')} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"><Check size={14}/> Valider</button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><X size={14}/> Annuler</button>
      </div>
    </form>
  );
}

export default function ProductsPreviewPage() {
  const qc = useQueryClient();
  const { data: cards = [], isLoading } = useQuery<ProdCard[]>({ queryKey: ['website-products'], queryFn: () => websiteService.listProducts() });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const createMut = useMutation({ mutationFn: (d: ProdFormValues) => websiteService.createProduct(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['website-products'] }); setAdding(false); }});
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: object }) => websiteService.updateProduct(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['website-products'] }); setEditId(null); }});
  const deleteMut = useMutation({ mutationFn: (id: string) => websiteService.deleteProduct(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['website-products'] })});
  const imgMut   = useMutation({ mutationFn: ({ id, file }: { id: string; file: File }) => websiteService.uploadProductImage(id, file), onSuccess: () => qc.invalidateQueries({ queryKey: ['website-products'] })});
  const toggleMut = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => websiteService.updateProduct(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ['website-products'] })});
  const reorderMut = useMutation({ mutationFn: (ids: string[]) => websiteService.reorderProducts(ids), onSuccess: () => qc.invalidateQueries({ queryKey: ['website-products'] })});

  if (isLoading) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/website" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Produits phares</h1>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="space-y-3">
        {adding && <ProdForm onSave={d => createMut.mutate(d)} onCancel={() => setAdding(false)} />}

        <SortableList
          items={cards}
          disabled={editId !== null || adding}
          onReorder={ids => reorderMut.mutate(ids)}
          renderItem={card => (
            <div className={`bg-white border rounded-xl p-4 ${!card.active ? 'opacity-50' : ''}`}>
              {editId === card.id ? (
                <ProdForm initial={card} onSave={d => updateMut.mutate({ id: card.id, d })} onCancel={() => setEditId(null)} />
              ) : (
                <div className="flex items-start gap-3">
                  {card.imageUrl
                    ? <img src={card.imageUrl} alt={card.title} className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0" />
                    : <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0 text-xs font-bold">{card.title.charAt(0)}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{card.title}</span>
                      {card.badge && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">{card.badge}</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{card.description}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => fileRefs.current[card.id]?.click()}
                      disabled={imgMut.isPending}
                      className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-500"
                    >
                      <Upload size={12}/> Image
                    </button>
                    <input ref={el => { fileRefs.current[card.id] = el; }} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if(f) imgMut.mutate({id: card.id, file: f}); }} />
                    <button onClick={() => toggleMut.mutate({ id: card.id, active: !card.active })} className={`px-2 py-1 rounded text-xs font-semibold ${card.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {card.active ? 'Actif' : 'Masqué'}
                    </button>
                    <button onClick={() => setEditId(card.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 size={14}/></button>
                    <button onClick={() => { if(confirm('Supprimer ?')) deleteMut.mutate(card.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={14}/></button>
                  </div>
                </div>
              )}
            </div>
          )}
        />

        {cards.length === 0 && !adding && (
          <div className="text-center py-8 text-gray-400 text-sm">Aucune carte. Les valeurs par défaut sont affichées.</div>
        )}
      </div>
    </div>
  );
}
