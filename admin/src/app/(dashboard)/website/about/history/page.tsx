'use client';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface HistoryForm { title: string; content: string; }

export default function AboutHistoryPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['about-history'], queryFn: websiteService.getAboutHistory });
  const { register, handleSubmit, control, reset, watch } = useForm<HistoryForm>({
    defaultValues: { title: 'Notre histoire', content: '' },
  });

  useEffect(() => {
    if (data) reset({ title: data.title || 'Notre histoire', content: data.content || '' });
  }, [data, reset]);

  const saveMut = useMutation({
    mutationFn: (form: HistoryForm) => websiteService.upsertAboutHistory(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['about-history'] }),
  });

  const content = watch('content');

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/website/about" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> Retour À propos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Histoire</h1>
        <p className="text-sm text-gray-500 mt-1">Mise en forme riche : gras, listes, liens, titres.</p>
      </div>

      <form onSubmit={handleSubmit(d => saveMut.mutate(d))} className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la section</label>
            <input
              {...register('title')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <RichTextEditor value={field.value} onChange={field.onChange} placeholder="Primeo est née d'une conviction simple…" />
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
