'use client';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { SortableList } from '@/components/ui/SortableList';
import { Plus, Trash2, ArrowLeft, Edit2, X, Check, Upload } from 'lucide-react';
import Link from 'next/link';

interface Member { id: string; name: string; role: string; bio?: string; initials?: string; photoUrl?: string; active: boolean; sortOrder: number; }
type MemberDraft = Pick<Member, 'name' | 'role' | 'bio' | 'initials'>;
const EMPTY: MemberDraft = { name: '', role: '', bio: '', initials: '' };

function MemberForm({ initial, onSave, onCancel }: { initial?: Partial<MemberDraft>; onSave: (d: MemberDraft) => void; onCancel: () => void; }) {
  const { register, handleSubmit, formState: { errors } } = useForm<MemberDraft>({ defaultValues: { ...EMPTY, ...initial } });
  return (
    <form onSubmit={handleSubmit(onSave)} className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nom complet *" {...register('name', { required: true })} />
          {errors.name && <span className="text-xs text-red-600">Nom requis</span>}
        </div>
        <div>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Rôle / Titre *" {...register('role', { required: true })} />
          {errors.role && <span className="text-xs text-red-600">Rôle requis</span>}
        </div>
        <input className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Initiales (ex: KA)" {...register('initials')} />
      </div>
      <textarea className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} placeholder="Biographie courte" {...register('bio')} />
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"><Check size={14} /> Valider</button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><X size={14} /> Annuler</button>
      </div>
    </form>
  );
}

export default function AboutTeamPage() {
  const qc = useQueryClient();
  const { data: members = [], isLoading } = useQuery<Member[]>({ queryKey: ['about-team'], queryFn: websiteService.listAboutTeam });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const photoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const createMut = useMutation({ mutationFn: (d: MemberDraft) => websiteService.createAboutTeam(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['about-team'] }); setAdding(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<MemberDraft> }) => websiteService.updateAboutTeam(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['about-team'] }); setEditId(null); } });
  const toggleMut = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => websiteService.updateAboutTeam(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ['about-team'] }) });
  const photoMut = useMutation({ mutationFn: ({ id, file }: { id: string; file: File }) => websiteService.uploadAboutTeamPhoto(id, file), onSuccess: () => qc.invalidateQueries({ queryKey: ['about-team'] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => websiteService.deleteAboutTeam(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['about-team'] }) });
  const reorderMut = useMutation({ mutationFn: (ids: string[]) => websiteService.reorderAboutTeam(ids), onSuccess: () => qc.invalidateQueries({ queryKey: ['about-team'] }) });

  if (isLoading) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/website/about" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Équipe fondatrice</h1>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="space-y-3">
        {adding && <MemberForm onSave={d => createMut.mutate(d)} onCancel={() => setAdding(false)} />}

        <SortableList
          items={members}
          disabled={editId !== null || adding}
          onReorder={ids => reorderMut.mutate(ids)}
          renderItem={m => (
            <div className={`bg-white border rounded-xl p-4 ${!m.active ? 'opacity-50' : ''}`}>
              {editId === m.id ? (
                <MemberForm initial={m} onSave={d => updateMut.mutate({ id: m.id, d })} onCancel={() => setEditId(null)} />
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-blue-100 flex items-center justify-center">
                    {m.photoUrl
                      ? <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                      : <span className="text-blue-700 font-bold text-sm">{m.initials || m.name?.charAt(0)}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                    <p className="text-xs text-blue-600 font-medium">{m.role}</p>
                    {m.bio && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.bio}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => toggleMut.mutate({ id: m.id, active: !m.active })} className={`px-2 py-1 rounded text-xs font-semibold ${m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.active ? 'Actif' : 'Masqué'}</button>
                    <button onClick={() => photoRefs.current[m.id]?.click()} disabled={photoMut.isPending} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Photo"><Upload size={14} /></button>
                    <input ref={el => { photoRefs.current[m.id] = el; }} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) photoMut.mutate({ id: m.id, file: f }); }} />
                    <button onClick={() => setEditId(m.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(m.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        />

        {members.length === 0 && !adding && (
          <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <p className="text-sm">Aucun membre. Les données par défaut sont affichées sur le site.</p>
          </div>
        )}
      </div>
      {members.length > 0 && <p className="text-xs text-gray-400 mt-4">💡 Glissez-déposez pour réordonner.</p>}
    </div>
  );
}
