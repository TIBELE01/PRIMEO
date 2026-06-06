'use client';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { Save, Upload, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PresForm { title: string; intro1: string; intro2: string; intro3: string; }
interface TeamForm { text: string; }

export default function CareersPresentation() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: pres, isLoading: presLoading } = useQuery({ queryKey: ['careers-pres'], queryFn: websiteService.getCareersPresentation });
  const { data: team, isLoading: teamLoading } = useQuery({ queryKey: ['careers-team'], queryFn: websiteService.getCareersTeam });

  const presForm = useForm<PresForm>({ defaultValues: { title: '', intro1: '', intro2: '', intro3: '' } });
  const teamForm = useForm<TeamForm>({ defaultValues: { text: '' } });

  useEffect(() => {
    if (pres) presForm.reset({ title: pres.title || '', intro1: pres.intro1 || '', intro2: pres.intro2 || '', intro3: pres.intro3 || '' });
  }, [pres]);

  useEffect(() => {
    if (team) teamForm.reset({ text: team.text || '' });
  }, [team]);

  const savePresMut = useMutation({
    mutationFn: (d: PresForm) => websiteService.upsertCareersPresentation(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['careers-pres'] }),
  });

  const saveTeamMut = useMutation({
    mutationFn: (d: { text: string; photo?: File }) => websiteService.upsertCareersTeam(d.text, d.photo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['careers-team'] }),
  });

  if (presLoading || teamLoading) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/website/careers" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold text-gray-900">Présentation &amp; Équipe</h1>
      </div>

      {/* Presentation */}
      <form onSubmit={presForm.handleSubmit(d => savePresMut.mutate(d))} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Textes de présentation</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titre principal</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...presForm.register('title')} />
        </div>
        {(['intro1', 'intro2', 'intro3'] as const).map((k, i) => (
          <div key={k}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paragraphe {i + 1}{i > 0 ? ' (optionnel)' : ''}</label>
            <textarea rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" {...presForm.register(k)} />
          </div>
        ))}
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={savePresMut.isPending} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            <Save size={15} /> {savePresMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {savePresMut.isSuccess && <span className="text-green-600 text-sm font-medium">✓ Sauvegardé !</span>}
        </div>
      </form>

      {/* Team */}
      <form
        onSubmit={teamForm.handleSubmit(d => saveTeamMut.mutate({ text: d.text }))}
        className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-base font-semibold text-gray-900">Section équipe</h2>
        {team?.photoUrl && (
          <img src={team.photoUrl} alt="Photo équipe" className="h-40 w-full object-cover rounded-lg" />
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Texte accompagnement photo</label>
          <textarea rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" {...teamForm.register('text')} />
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) saveTeamMut.mutate({ text: teamForm.getValues('text'), photo: f }); }}
        />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saveTeamMut.isPending} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            <Save size={15} /> {saveTeamMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <Upload size={15} /> Changer la photo
          </button>
          {saveTeamMut.isSuccess && <span className="text-green-600 text-sm font-medium">✓ Sauvegardé !</span>}
        </div>
      </form>
    </div>
  );
}
