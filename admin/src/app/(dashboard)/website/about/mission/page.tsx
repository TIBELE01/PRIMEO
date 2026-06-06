'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface MissionForm { title: string; content: string; }

export default function AboutMissionPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['about-mission'], queryFn: websiteService.getAboutMission });
  const { register, handleSubmit, control, reset, watch } = useForm<MissionForm>({
    defaultValues: { title: 'Notre mission', content: '' },
  });

  useEffect(() => {
    if (data) reset({ title: data.title || 'Notre mission', content: data.content || '' });
  }, [data, reset]);

  const saveMut = useMutation({
    mutationFn: (form: MissionForm) => websiteService.upsertAboutMission(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['about-mission'] }),
  });

  const content = watch('content');

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/website/about" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> Retour À propos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Mission</h1>
      </div>

      <form onSubmit={handleSubmit(d => saveMut.mutate(d))} className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              {...register('title')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texte de la mission</label>
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <RichTextEditor value={field.value} onChange={field.onChange} placeholder="Rendre la gestion de l'énergie accessible…" />
              )}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            type="submit"
            disabled={saveMut.isPending || !content || content === '<p></p>'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={15} /> {saveMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {saveMut.isSuccess && <span className="text-sm text-green-600">Sauvegardé ✓</span>}
          {isLoading && <span className="text-sm text-gray-400">Chargement…</span>}
        </div>
      </form>
    </div>
  );
}
