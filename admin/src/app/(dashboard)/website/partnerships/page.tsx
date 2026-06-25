'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '@/services/api';
import { Building2, Mail, Phone, Calendar, ChevronDown, Trash2, Eye, X } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En attente',  color: 'bg-yellow-100 text-yellow-800' },
  reviewed:  { label: 'Examinée',    color: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Contacté',    color: 'bg-green-100 text-green-800' },
  rejected:  { label: 'Rejetée',     color: 'bg-red-100 text-red-800' },
};

const TYPE_COLORS: Record<string, string> = {
  'Technologique':  'bg-indigo-50 text-indigo-700',
  'Commercial':     'bg-emerald-50 text-emerald-700',
  'Média':          'bg-amber-50 text-amber-700',
  'Institutionnel': 'bg-purple-50 text-purple-700',
};

type Request = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  partnershipType: string;
  message: string;
  status: string;
  createdAt: string;
};

export default function PartnershipsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Request | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['partnerships', page, statusFilter],
    queryFn: () => websiteService.listPartnerships(page, 20, statusFilter === 'all' ? undefined : statusFilter),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      websiteService.updatePartnershipStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partnerships'] }),
  });

  const deleteReq = useMutation({
    mutationFn: (id: string) => websiteService.deletePartnership(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partnerships'] });
      setDetail(null);
    },
  });

  const requests: Request[] = data?.requests ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes de partenariat</h1>
          <p className="mt-1 text-gray-500 text-sm">{total} demande{total !== 1 ? 's' : ''} au total</p>
        </div>
        <a href="/devenir-partenaire/" target="_blank" rel="noopener noreferrer"
           className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          Voir la page →
        </a>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { value: 'all',       label: 'Toutes' },
          { value: 'pending',   label: 'En attente' },
          { value: 'reviewed',  label: 'Examinées' },
          { value: 'contacted', label: 'Contactées' },
          { value: 'rejected',  label: 'Rejetées' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Chargement…</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Aucune demande pour ce filtre.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Entreprise</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const st = STATUS_LABELS[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-700' };
                  const tc = TYPE_COLORS[r.partnershipType] ?? 'bg-gray-50 text-gray-700';
                  return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          <Building2 size={14} className="text-gray-400 flex-shrink-0" />
                          {r.companyName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-gray-100">{r.contactName}</div>
                        <div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                          <Mail size={11} />{r.email}
                        </div>
                        {r.phone && (
                          <div className="text-gray-500 text-xs flex items-center gap-1">
                            <Phone size={11} />{r.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${tc}`}>
                          {r.partnershipType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-500 flex items-center gap-1">
                          <Calendar size={13} />{fmt(r.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative inline-flex items-center gap-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>
                            {st.label}
                          </span>
                          <div className="relative group">
                            <button className="p-1 hover:bg-gray-100 rounded" title="Changer le statut">
                              <ChevronDown size={13} className="text-gray-400 dark:text-gray-500" />
                            </button>
                            <div className="absolute right-0 top-6 z-10 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-focus-within:block min-w-[140px]">
                              {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                                <button
                                  key={val}
                                  onClick={() => updateStatus.mutate({ id: r.id, status: val })}
                                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDetail(r)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="Voir le message"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Supprimer la demande de ${r.companyName} ?`)) deleteReq.mutate(r.id); }}
                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <span className="text-sm text-gray-500">Page {page} / {pages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Précédente
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Suivante →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail slide-over */}
      {detail && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDetail(null)} />
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h2 className="font-bold text-gray-900">{detail.companyName}</h2>
                <p className="text-sm text-gray-500">{detail.contactName} · {detail.email}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 flex-1">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Type</p>
                  <p className="text-sm font-semibold">{detail.partnershipType}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Date</p>
                  <p className="text-sm font-semibold">{fmt(detail.createdAt)}</p>
                </div>
                {detail.phone && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Téléphone</p>
                    <p className="text-sm font-semibold">{detail.phone}</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Statut</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABELS[detail.status]?.color ?? ''}`}>
                    {STATUS_LABELS[detail.status]?.label ?? detail.status}
                  </span>
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Message</p>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {detail.message}
                </div>
              </div>

              {/* Change status */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Changer le statut</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([val, { label, color }]) => (
                    <button
                      key={val}
                      onClick={() => {
                        updateStatus.mutate({ id: detail.id, status: val });
                        setDetail({ ...detail, status: val });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        detail.status === val
                          ? color + ' ring-2 ring-offset-1 ring-current'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-5 border-t border-gray-200 flex gap-3">
              <a
                href={`mailto:${detail.email}?subject=Partenariat Primeo — ${detail.partnershipType}`}
                className="flex-1 text-center py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Répondre par email
              </a>
              <button
                onClick={() => { if (confirm(`Supprimer la demande de ${detail.companyName} ?`)) deleteReq.mutate(detail.id); }}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
