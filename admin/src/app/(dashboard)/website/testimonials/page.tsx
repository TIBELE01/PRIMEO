'use client';
import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { SortableList } from '@/components/ui/SortableList';
import { Plus, Trash2, ArrowLeft, Edit2, X, Check, Upload, Star } from 'lucide-react';
import Link from 'next/link';

interface Testimonial {
  id: string;
  name: string;
  rating: number;
  text: string;
  photoUrl?: string;
  active: boolean;
  sortOrder: number;
}
interface TestimonialFormValues { name: string; rating: number; text: string; }

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`text-xl transition-colors ${n <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}>
          ★
        </button>
      ))}
    </div>
  );
}

function TestimonialForm({ initial, onSave, onCancel }: {
  initial?: Partial<Testimonial>;
  onSave: (d: TestimonialFormValues) => void;
  onCancel: () => void;
}) {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<TestimonialFormValues>({
    defaultValues: { name: initial?.name || '', rating: initial?.rating ?? 5, text: initial?.text || '' },
  });
  const text = watch('text');
  return (
    <form onSubmit={handleSubmit(onSave)} className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600">Nom du client</label>
          <input
            className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Ama Konan"
            {...register('name', { required: true })}
          />
          {errors.name && <span className="text-xs text-red-600">Nom requis</span>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Note</label>
          <Controller name="rating" control={control} render={({ field }) => (
            <StarRating value={field.value} onChange={field.onChange} />
          )} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600">Témoignage (100–150 caractères recommandés)</label>
        <textarea
          className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
          placeholder="Décrivez l'expérience du client…"
          {...register('text', { required: true })}
        />
        <p className="text-xs text-gray-400 mt-0.5">{(text || '').length} caractères</p>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"><Check size={14} /> Valider</button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><X size={14} /> Annuler</button>
      </div>
    </form>
  );
}

export default function TestimonialsPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ['website-testimonials'],
    queryFn: () => websiteService.listTestimonials(),
  });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const createMut = useMutation({
    mutationFn: (d: TestimonialFormValues) => websiteService.createTestimonial(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['website-testimonials'] }); setAdding(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: object }) => websiteService.updateTestimonial(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['website-testimonials'] }); setEditId(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => websiteService.deleteTestimonial(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-testimonials'] }),
  });
  const photoMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => websiteService.uploadTestimonialPhoto(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-testimonials'] }),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => websiteService.updateTestimonial(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-testimonials'] }),
  });
  const reorderMut = useMutation({
    mutationFn: (ids: string[]) => websiteService.reorderTestimonials(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-testimonials'] }),
  });

  if (isLoading) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/website" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Témoignages</h1>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="space-y-3">
        {adding && <TestimonialForm onSave={d => createMut.mutate(d)} onCancel={() => setAdding(false)} />}

        <SortableList
          items={items}
          disabled={editId !== null || adding}
          onReorder={ids => reorderMut.mutate(ids)}
          renderItem={item => (
            <div className={`bg-white border rounded-xl p-4 ${!item.active ? 'opacity-50' : ''}`}>
              {editId === item.id ? (
                <TestimonialForm initial={item} onSave={d => updateMut.mutate({ id: item.id, d })} onCancel={() => setEditId(null)} />
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-blue-100 flex items-center justify-center">
                    {item.photoUrl
                      ? <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                      : <span className="text-blue-600 font-bold text-lg">{item.name.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={12} className={n <= item.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">"{item.text}"</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => fileRefs.current[item.id]?.click()}
                      disabled={photoMut.isPending}
                      className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-500 disabled:opacity-50"
                    >
                      <Upload size={12} /> Photo
                    </button>
                    <input
                      ref={el => { fileRefs.current[item.id] = el; }}
                      type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) photoMut.mutate({ id: item.id, file: f }); }}
                    />
                    <button onClick={() => toggleMut.mutate({ id: item.id, active: !item.active })} className={`px-2 py-1 rounded text-xs font-semibold ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.active ? 'Actif' : 'Masqué'}
                    </button>
                    <button onClick={() => setEditId(item.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm('Supprimer ce témoignage ?')) deleteMut.mutate(item.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        />

        {items.length === 0 && !adding && (
          <div className="text-center py-12 text-gray-400">
            <Star size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm">Aucun témoignage. Les données par défaut sont affichées sur le site.</p>
            <button onClick={() => setAdding(true)} className="mt-3 text-blue-600 text-sm font-semibold hover:underline">
              Ajouter le premier témoignage
            </button>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <p className="text-xs text-gray-400 mt-4">
          💡 Glissez-déposez (poignée à gauche) pour réordonner les témoignages.
        </p>
      )}
    </div>
  );
}
