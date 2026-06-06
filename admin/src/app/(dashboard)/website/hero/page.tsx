'use client';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { Upload, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface HeroForm { title: string; subtitle: string; buttonText: string; buttonUrl: string; }

export default function HeroPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: hero, isLoading } = useQuery({ queryKey: ['website-hero'], queryFn: () => websiteService.getHero() });

  const { register, handleSubmit, reset } = useForm<HeroForm>({
    defaultValues: { title: '', subtitle: '', buttonText: '', buttonUrl: '' },
  });
  const [saved, setSaved] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  useEffect(() => {
    if (hero) {
      reset({
        title: hero.title || '',
        subtitle: hero.subtitle || '',
        buttonText: hero.buttonText || "Télécharger l'application",
        buttonUrl: hero.buttonUrl || '#',
      });
      if (hero.imageUrl) setImgPreview(hero.imageUrl);
    }
  }, [hero, reset]);

  const saveMut = useMutation({
    mutationFn: (form: HeroForm) => websiteService.updateHero(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['website-hero'] }); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  const imgMut = useMutation({
    mutationFn: (file: File) => websiteService.uploadHeroImage(file),
    onSuccess: (data: any) => { setImgPreview(data.imageUrl); qc.invalidateQueries({ queryKey: ['website-hero'] }); },
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgPreview(URL.createObjectURL(file));
    imgMut.mutate(file);
  }

  if (isLoading) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/website" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold text-gray-900">Section Hero</h1>
      </div>

      <form onSubmit={handleSubmit(d => saveMut.mutate(d))} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Titre principal</label>
          <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} {...register('title')} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Sous-titre</label>
          <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} {...register('subtitle')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Texte du bouton</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('buttonText')} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Lien du bouton</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('buttonUrl')} />
          </div>
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Image (smartphone)</label>
          <div className="flex items-start gap-4">
            {imgPreview && <img src={imgPreview} alt="Hero" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={imgMut.isPending}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              <Upload size={16} />
              {imgMut.isPending ? 'Upload…' : 'Choisir une image'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saveMut.isPending}
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
