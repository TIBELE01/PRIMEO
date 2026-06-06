'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { ArrowLeft, Plus, Trash2, Save, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

const DEPARTMENTS = ['Technologie', 'Commercial', 'Produit', 'Finance', 'Marketing', 'Opérations', 'RH', 'Direction'];
const TYPES = ['CDI', 'CDD', 'Stage', 'Freelance', 'Alternance'];

interface JobFormValues { title: string; department: string; location: string; type: string; description: string; profile: string; offer: string; process: string; expiresAt: string; }
const EMPTY: JobFormValues = { title: '', department: '', location: 'Abidjan', type: 'CDI', description: '', profile: '', offer: '', process: '', expiresAt: '' };

function JobFields({ register, errors }: { register: any; errors: any }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Titre du poste *</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('title', { required: true })} />
          {errors.title && <span className="text-xs text-red-600">Titre requis</span>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Département *</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('department', { required: true })}>
            <option value="">— Choisir —</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors.department && <span className="text-xs text-red-600">Département requis</span>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Localisation</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('location')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type de contrat</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('type')}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Date d'expiration (optionnel)</label>
          <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('expiresAt')} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description du poste *</label>
        <textarea rows={4} placeholder="Décrivez les responsabilités…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" {...register('description', { required: true })} />
        {errors.description && <span className="text-xs text-red-600">Description requise</span>}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Profil recherché *</label>
        <textarea rows={3} placeholder="Expérience, compétences requises…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" {...register('profile', { required: true })} />
        {errors.profile && <span className="text-xs text-red-600">Profil requis</span>}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Ce que nous offrons (optionnel)</label>
        <textarea rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" {...register('offer')} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Processus de recrutement (optionnel)</label>
        <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" {...register('process')} />
      </div>
    </div>
  );
}

function CreateJobForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<JobFormValues>({ defaultValues: EMPTY });
  const mut = useMutation({
    mutationFn: (d: JobFormValues) => websiteService.createCareersJob(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['careers-jobs'] }); onSuccess(); },
  });
  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} className="bg-white border border-blue-200 rounded-xl p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Nouvelle offre d'emploi</h2>
      <JobFields register={register} errors={errors} />
      <div className="flex gap-2 pt-3">
        <button type="submit" disabled={mut.isPending} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"><Save size={14} /> {mut.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">Annuler</button>
      </div>
    </form>
  );
}

function EditJobForm({ job, onSuccess, onCancel }: { job: any; onSuccess: () => void; onCancel: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<JobFormValues>({
    defaultValues: { title: job.title, department: job.department, location: job.location, type: job.type, description: job.description, profile: job.profile, offer: job.offer || '', process: job.process || '', expiresAt: job.expiresAt ? job.expiresAt.split('T')[0] : '' },
  });
  const mut = useMutation({
    mutationFn: (d: JobFormValues) => websiteService.updateCareersJob(job.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['careers-jobs'] }); onSuccess(); },
  });
  return (
    <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-3">
      <JobFields register={register} errors={errors} />
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={mut.isPending} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"><Save size={14} /> {mut.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">Annuler</button>
      </div>
    </form>
  );
}

export default function CareersJobsPage() {
  const qc = useQueryClient();
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ['careers-jobs'], queryFn: websiteService.listCareersJobs });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => websiteService.updateCareersJob(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['careers-jobs'] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => websiteService.deleteCareersJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['careers-jobs'] }),
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/website/careers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"><ArrowLeft size={14} /> Retour Carrières</Link>
          <h1 className="text-2xl font-bold text-gray-900">Offres d'emploi</h1>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={15} /> Nouvelle offre
        </button>
      </div>

      {showForm && <CreateJobForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />}

      {isLoading ? <p className="text-sm text-gray-500">Chargement…</p> : (
        <div className="space-y-3">
          {(jobs as any[]).map(j => (
            <div key={j.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{j.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${j.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{j.active ? 'Actif' : 'Inactif'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{j.department} · {j.location} · {j.type}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleMut.mutate({ id: j.id, active: !j.active })}>
                    {j.active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
                  </button>
                  <button onClick={() => { setEditingId(j.id); setExpanded(j.id); }} className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50">Éditer</button>
                  <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(j.id); }} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                  <button onClick={() => setExpanded(v => v === j.id ? null : j.id)} className="text-gray-400 hover:text-gray-600">
                    {expanded === j.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
              {expanded === j.id && (
                <div className="border-t border-gray-100 p-4">
                  {editingId === j.id ? (
                    <EditJobForm job={j} onSuccess={() => setEditingId(null)} onCancel={() => setEditingId(null)} />
                  ) : (
                    <div className="space-y-3 text-sm text-gray-700">
                      <div><span className="font-medium">Description :</span><p className="mt-1 whitespace-pre-line text-gray-600">{j.description}</p></div>
                      <div><span className="font-medium">Profil :</span><p className="mt-1 whitespace-pre-line text-gray-600">{j.profile}</p></div>
                      {j.offer && <div><span className="font-medium">Offre :</span><p className="mt-1 whitespace-pre-line text-gray-600">{j.offer}</p></div>}
                      {j.process && <div><span className="font-medium">Processus :</span><p className="mt-1 whitespace-pre-line text-gray-600">{j.process}</p></div>}
                      {j.expiresAt && <p className="text-xs text-gray-500">Expire le {new Date(j.expiresAt).toLocaleDateString('fr-FR')}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {jobs.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Aucune offre. Créez votre première offre ci-dessus.</p>}
        </div>
      )}
    </div>
  );
}
