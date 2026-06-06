'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { ArrowLeft, Trash2, ExternalLink, ChevronDown, ChevronUp, Save } from 'lucide-react';
import Link from 'next/link';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  received:   { label: 'Reçue',      color: 'bg-blue-100 text-blue-700' },
  reviewing:  { label: 'En cours',   color: 'bg-yellow-100 text-yellow-700' },
  interview:  { label: 'Entretien',  color: 'bg-purple-100 text-purple-700' },
  rejected:   { label: 'Refusée',    color: 'bg-red-100 text-red-700' },
  hired:      { label: 'Recrutée',   color: 'bg-green-100 text-green-700' },
};

export default function ApplicationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['careers-applications', filter],
    queryFn: () => websiteService.listApplications(filter || undefined),
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const updateMut = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      websiteService.updateApplicationStatus(id, status, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['careers-applications'] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => websiteService.deleteApplication(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['careers-applications'] }),
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/website/careers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft size={14} /> Retour Carrières</Link>
        <h1 className="text-2xl font-bold text-gray-900">Candidatures spontanées</h1>
        <p className="text-sm text-gray-500 mt-1">{apps.length} candidature{apps.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['', ...Object.keys(STATUS_LABELS)].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
          >
            {s ? STATUS_LABELS[s]?.label : 'Toutes'}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-sm text-gray-500">Chargement…</p> : (
        <div className="space-y-3">
          {apps.map((a: any) => {
            const st = STATUS_LABELS[a.status] ?? { label: a.status, color: 'bg-gray-100 text-gray-600' };
            return (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-blue-700">
                    {a.firstName[0]}{a.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{a.firstName} {a.lastName}</p>
                    <p className="text-xs text-gray-500">{a.email}{a.phone ? ` · ${a.phone}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                    <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString('fr-FR')}</span>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(a.id); }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    <button onClick={() => setExpanded(v => v === a.id ? null : a.id)} className="text-gray-400 hover:text-gray-600">
                      {expanded === a.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>
                {expanded === a.id && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    {a.message && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Message</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{a.message}</p>
                      </div>
                    )}
                    {a.cvUrl && (
                      <a href={a.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                        <ExternalLink size={13} /> Télécharger le CV
                      </a>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Statut</p>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(STATUS_LABELS).map(([val, { label, color }]) => (
                          <button
                            key={val}
                            onClick={() => updateMut.mutate({ id: a.id, status: val })}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${a.status === val ? color + ' border-current' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Notes internes</p>
                      <textarea
                        rows={2}
                        defaultValue={a.notes || ''}
                        onChange={e => setNotes(n => ({ ...n, [a.id]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        placeholder="Ajouter une note…"
                      />
                      <button
                        onClick={() => updateMut.mutate({ id: a.id, status: a.status, note: notes[a.id] })}
                        className="mt-1.5 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                      >
                        <Save size={12} /> Sauvegarder les notes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {apps.length === 0 && <p className="text-sm text-gray-400 text-center py-10">Aucune candidature reçue.</p>}
        </div>
      )}
    </div>
  );
}
