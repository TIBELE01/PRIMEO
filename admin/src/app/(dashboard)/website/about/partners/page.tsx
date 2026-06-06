'use client';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { SortableList } from '@/components/ui/SortableList';
import { Plus, Trash2, ArrowLeft, Edit2, X, Check, Upload, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Partner { id: string; name: string; url?: string; logoUrl?: string; active: boolean; sortOrder: number; }
type PartnerDraft = Pick<Partner, 'name' | 'url'>;
const EMPTY: PartnerDraft = { name: '', url: '' };

function PartnerForm({ initial, onSave, onCancel }: { initial?: Partial<PartnerDraft>; onSave: (d: PartnerDraft) => void; onCancel: () => void; }) {
  const { register, handleSubmit, formState: { errors } } = useForm<PartnerDraft>({ defaultValues: { ...EMPTY, ...initial } });
  return (
    <form onSubmit={handleSubmit(onSave)} className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nom du partenaire *" {...register('name', { required: true })} />
          {errors.name && <span className="text-xs text-red-600">Nom requis</span>}
        </div>
        <input type="url" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="URL (optionnel)" {...register('url')} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"><Check size={14} /> Valider</button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><X size={14} /> Annuler</button>
      </div>
    </form>
  );
}

export default function AboutPartnersPage() {
  const qc = useQueryClient();
  const { data: partners = [], isLoading } = useQuery<Partner[]>({ queryKey: ['about-partners'], queryFn: websiteService.listAboutPartners });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const logoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const createMut = useMutation({ mutationFn: (d: PartnerDraft) => websiteService.createAboutPartner(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['about-partners'] }); setAdding(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<PartnerDraft> }) => websiteService.updateAboutPartner(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['about-partners'] }); setEditId(null); } });
  const toggleMut = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => websiteService.updateAboutPartner(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ['about-partners'] }) });
  const logoMut = useMutation({ mutationFn: ({ id, file }: { id: string; file: File }) => websiteService.uploadAboutPartnerLogo(id, file), onSuccess: () => qc.invalidateQueries({ queryKey: ['about-partners'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => websiteService.deleteAboutPartner(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['about-partners'] }) });
  const reorderMut = useMutation({ mutationFn: (ids: string[]) => websiteService.reorderAboutPartners(ids), onSuccess: () => qc.invalidateQueries({ queryKey: ['about-partners'] }) });

  if (isLoading) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/website/about" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Partenaires</h1>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="space-y-3">
        {adding && <PartnerForm onSave={d => createMut.mutate(d)} onCancel={() => setAdding(false)} />}

        <SortableList
          items={partners}
          disabled={editId !== null || adding}
          onReorder={ids => reorderMut.mutate(ids)}
          renderItem={p => (
            <div className={`bg-white border rounded-xl p-4 ${!p.active ? 'opacity-50' : ''}`}>
              {editId === p.id ? (
                <PartnerForm initial={p} onSave={d => updateMut.mutate({ id: p.id, d })} onCancel={() => setEditId(null)} />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-10 rounded border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {p.logoUrl
                      ? <img src={p.logoUrl} alt={p.name} className="max-w-full max-h-full object-contain" />
                      : <span className="text-xs text-gray-400 font-medium">{p.name?.slice(0, 3).toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                    {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"><ExternalLink size={10} /> {p.url}</a>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => toggleMut.mutate({ id: p.id, active: !p.active })} className={`px-2 py-1 rounded text-xs font-semibold ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.active ? 'Actif' : 'Masqué'}</button>
                    <button onClick={() => logoRefs.current[p.id]?.click()} disabled={logoMut.isPending} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Logo"><Upload size={14} /></button>
                    <input ref={el => { logoRefs.current[p.id] = el; }} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) logoMut.mutate({ id: p.id, file: f }); }} />
                    <button onClick={() => setEditId(p.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(p.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        />

        {partners.length === 0 && !adding && (
          <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <p className="text-sm">Aucun partenaire.</p>
          </div>
        )}
      </div>
      {partners.length > 0 && <p className="text-xs text-gray-400 mt-4">💡 Glissez-déposez pour réordonner.</p>}
    </div>
  );
}
