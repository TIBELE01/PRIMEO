'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { SortableList } from '@/components/ui/SortableList';
import { Plus, Trash2, ArrowLeft, Edit2, X, Check } from 'lucide-react';
import Link from 'next/link';

interface Bloc {
  id: string; icon: string; title: string; subtitle: string;
  description: string; features: string; ctaLabel: string; ctaUrl: string;
  active: boolean; sortOrder: number;
}

type BlocDraft = Omit<Bloc, 'id' | 'active' | 'sortOrder'>;

const EMPTY: BlocDraft = { icon: '🏨', title: '', subtitle: '', description: '', features: '[]', ctaLabel: 'En savoir plus', ctaUrl: '/solutions' };

function FeatureEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  let parsed: { icon: string; text: string }[] = [];
  try { parsed = JSON.parse(value); } catch { parsed = []; }

  const update = (items: { icon: string; text: string }[]) => onChange(JSON.stringify(items));
  const add = () => update([...parsed, { icon: '✓', text: '' }]);
  const remove = (i: number) => update(parsed.filter((_, idx) => idx !== i));
  const edit = (i: number, field: 'icon' | 'text', v: string) => {
    const next = parsed.map((f, idx) => idx === i ? { ...f, [field]: v } : f);
    update(next);
  };

  return (
    <div className="space-y-2">
      {parsed.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className="w-12 border border-gray-300 rounded px-2 py-1 text-sm text-center" value={f.icon} onChange={e => edit(i, 'icon', e.target.value)} placeholder="✓" />
          <input className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" value={f.text} onChange={e => edit(i, 'text', e.target.value)} placeholder="Texte de la fonctionnalité" />
          <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 p-1"><X size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
        <Plus size={12} /> Ajouter une fonctionnalité
      </button>
    </div>
  );
}

function BlocForm({ initial, onSave, onCancel }: { initial?: Partial<BlocDraft>; onSave: (d: BlocDraft) => void; onCancel: () => void; }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<BlocDraft>({ defaultValues: { ...EMPTY, ...initial } });
  return (
    <form onSubmit={handleSubmit(onSave)} className="border border-blue-200 bg-blue-50 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600">Titre</label>
          <input className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Pour les Voyageurs" {...register('title', { required: true })} />
          {errors.title && <span className="text-xs text-red-600">Titre requis</span>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Icône (emoji)</label>
          <input className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="✈️" {...register('icon')} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600">Sous-titre</label>
        <input className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Trouvez votre hébergement idéal" {...register('subtitle', { required: true })} />
        {errors.subtitle && <span className="text-xs text-red-600">Sous-titre requis</span>}
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600">Description</label>
        <textarea className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} {...register('description', { required: true })} />
        {errors.description && <span className="text-xs text-red-600">Description requise</span>}
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-2">Fonctionnalités</label>
        <Controller name="features" control={control} render={({ field }) => (
          <FeatureEditor value={field.value} onChange={field.onChange} />
        )} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600">Label bouton CTA</label>
          <input className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('ctaLabel')} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">URL bouton CTA</label>
          <input className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('ctaUrl')} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"><Check size={14} /> Valider</button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><X size={14} /> Annuler</button>
      </div>
    </form>
  );
}

export default function SolutionsBlocsPage() {
  const qc = useQueryClient();
  const { data: blocs = [], isLoading } = useQuery<Bloc[]>({
    queryKey: ['website-solutions-blocs'],
    queryFn: () => websiteService.listSolutionsBlocs(),
  });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (d: BlocDraft) => websiteService.createSolutionsBloc(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['website-solutions-blocs'] }); setAdding(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<BlocDraft> }) => websiteService.updateSolutionsBloc(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['website-solutions-blocs'] }); setEditId(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => websiteService.deleteSolutionsBloc(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-solutions-blocs'] }),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => websiteService.updateSolutionsBloc(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-solutions-blocs'] }),
  });
  const reorderMut = useMutation({
    mutationFn: (ids: string[]) => websiteService.reorderSolutionsBlocs(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-solutions-blocs'] }),
  });

  if (isLoading) return <div className="p-6 text-gray-500">Chargement…</div>;

  function parseFeatures(raw: string): { icon: string; text: string }[] {
    try { return JSON.parse(raw); } catch { return []; }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/website" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Solutions — Blocs accordéon</h1>
            <p className="text-sm text-gray-500 mt-0.5">Contenu de la page /solutions</p>
          </div>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={16} /> Ajouter un bloc
          </button>
        )}
      </div>

      <div className="space-y-3">
        {adding && <BlocForm onSave={d => createMut.mutate(d)} onCancel={() => setAdding(false)} />}

        <SortableList
          items={blocs}
          disabled={editId !== null || adding}
          onReorder={ids => reorderMut.mutate(ids)}
          renderItem={bloc => {
            const parsedFeatures = parseFeatures(bloc.features);
            return (
              <div className={`bg-white border rounded-xl p-4 ${!bloc.active ? 'opacity-50' : ''}`}>
                {editId === bloc.id ? (
                  <BlocForm initial={bloc} onSave={d => updateMut.mutate({ id: bloc.id, d })} onCancel={() => setEditId(null)} />
                ) : (
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0 mt-0.5">{bloc.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{bloc.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{bloc.subtitle}</div>
                      <div className="text-xs text-gray-400 mt-1 line-clamp-1">{bloc.description}</div>
                      {parsedFeatures.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {parsedFeatures.slice(0, 3).map((f, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f.icon} {f.text}</span>
                          ))}
                          {parsedFeatures.length > 3 && <span className="text-xs text-gray-400">+{parsedFeatures.length - 3} autres</span>}
                        </div>
                      )}
                      <div className="text-xs text-blue-500 mt-1">{bloc.ctaLabel} → {bloc.ctaUrl}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => toggleMut.mutate({ id: bloc.id, active: !bloc.active })} className={`px-2 py-1 rounded text-xs font-semibold ${bloc.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {bloc.active ? 'Actif' : 'Masqué'}
                      </button>
                      <button onClick={() => setEditId(bloc.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 size={14} /></button>
                      <button onClick={() => { if (confirm('Supprimer ce bloc ?')) deleteMut.mutate(bloc.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          }}
        />

        {blocs.length === 0 && !adding && (
          <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <p className="text-sm">Aucun bloc. Les valeurs par défaut sont affichées sur le site.</p>
          </div>
        )}
      </div>
    </div>
  );
}
