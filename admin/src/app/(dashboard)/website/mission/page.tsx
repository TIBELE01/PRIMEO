'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface MissionForm { text: string; }

export default function MissionPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['website-mission'], queryFn: () => websiteService.getMission() });
  const { register, handleSubmit, reset, watch } = useForm<MissionForm>({ defaultValues: { text: '' } });
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data?.text) reset({ text: data.text }); }, [data, reset]);

  const saveMut = useMutation({
    mutationFn: (form: MissionForm) => websiteService.updateMission(form.text),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['website-mission'] }); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  const text = watch('text');

  if (isLoading) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/website" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold text-gray-900">Texte de Mission</h1>
      </div>

      <form onSubmit={handleSubmit(d => saveMut.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Mission (150–200 caractères recommandés)</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={5}
            {...register('text', { required: true })}
          />
          <p className="text-xs text-gray-400 mt-1">{(text || '').length} caractères</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saveMut.isPending || !(text || '').trim()}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={16} /> {saveMut.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">✓ Sauvegardé !</span>}
          {saveMut.isError && <span className="text-red-600 text-sm">Erreur lors de la sauvegarde</span>}
        </div>
      </form>
    </div>
  );
}
