'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { disputesService } from '@/services/api';
import { useDataTable } from '@/hooks/useDataTable';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, Pagination } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatAmount } from '@/lib/utils';
import { AdminDispute } from '@/types/dispute';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
  open: 'warning', under_review: 'info', resolved_client: 'success', resolved_professional: 'success', rejected: 'default',
};
const statusLabel: Record<string, string> = {
  open: 'Ouvert', under_review: 'En révision', resolved_client: 'Résolu (client)',
  resolved_professional: 'Résolu (pro)', rejected: 'Rejeté',
};

function ageDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function getPriority(days: number): { label: string; variant: 'danger' | 'warning' | 'default' } {
  if (days >= 7) return { label: 'Critique', variant: 'danger' };
  if (days >= 2) return { label: 'Élevée', variant: 'warning' };
  return { label: 'Normale', variant: 'default' };
}

export default function DisputesPage() {
  const router = useRouter();
  const { queryParams, page, totalPages, handleSearch, handleFilter, handlePageChange, setTotalPages } = useDataTable();

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['disputes', queryParams],
    queryFn: () => disputesService.getDisputes(queryParams),
    retry: 1,
  });
  useEffect(() => {
    if (data?.total && data?.pageSize) setTotalPages(Math.ceil(data.total / data.pageSize));
  }, [data, setTotalPages]);

  const columns = [
    {
      key: 'priority',
      header: 'Priorité',
      render: (d: AdminDispute) => {
        const p = getPriority(ageDays(d.createdAt));
        return <Badge variant={p.variant}>{p.label}</Badge>;
      },
    },
    {
      key: 'reason',
      header: 'Objet',
      render: (d: AdminDispute) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{d.reason}</p>
          {d.propertyTitle && <p className="text-xs text-gray-400">{d.propertyTitle}</p>}
        </div>
      ),
    },
    { key: 'clientName', header: 'Client', render: (d: AdminDispute) => <span className="text-sm">{d.clientName}</span> },
    { key: 'professionalName', header: 'Professionnel', render: (d: AdminDispute) => <span className="text-sm">{d.professionalName}</span> },
    {
      key: 'requestedRefundAmount',
      header: 'Remb. demandé',
      render: (d: AdminDispute) => d.requestedRefundAmount
        ? <span className="text-sm font-medium text-gray-900">{formatAmount(d.requestedRefundAmount)}</span>
        : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (d: AdminDispute) => <Badge variant={statusVariant[d.status] ?? 'default'}>{statusLabel[d.status] ?? d.status}</Badge>,
    },
    {
      key: 'age',
      header: 'Ancienneté',
      render: (d: AdminDispute) => {
        const days = ageDays(d.createdAt);
        return (
          <span className={`text-xs ${days >= 7 ? 'text-red-600 font-semibold' : days >= 2 ? 'text-amber-600' : 'text-gray-500 dark:text-gray-400'}`}>
            {days}j
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Ouvert le',
      render: (d: AdminDispute) => <span className="text-xs text-gray-500">{formatDate(d.createdAt)}</span>,
    },
  ];

  const allDisputes: AdminDispute[] = data?.disputes ?? data?.data ?? data?.items ?? [];
  const openCount    = allDisputes.filter(d => d.status === 'open').length;
  const reviewCount  = allDisputes.filter(d => d.status === 'under_review').length;
  const criticalCount = allDisputes.filter(d => ageDays(d.createdAt) >= 7).length;
  const total        = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Litiges</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestion des conflits entre clients et professionnels</p>
        </div>
        {total > 0 && (
          <p className="text-sm text-gray-500">{total.toLocaleString('fr-FR')} litige{total > 1 ? 's' : ''}</p>
        )}
      </div>

      {/* Summary KPIs */}
      {(openCount > 0 || criticalCount > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{openCount}</p>
            <p className="text-xs text-amber-600 mt-0.5">Ouverts</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{reviewCount}</p>
            <p className="text-xs text-blue-600 mt-0.5">En révision</p>
          </div>
          <div className={`${criticalCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-700' : 'text-gray-500 dark:text-gray-400'}`}>{criticalCount}</p>
            <p className={`text-xs mt-0.5 ${criticalCount > 0 ? 'text-red-600' : 'text-gray-400 dark:text-gray-500'}`}>Critiques (+7j)</p>
          </div>
        </div>
      )}

      <Card padding={false}>
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Rechercher par client, professionnel, annonce…"
              onChange={(e) => handleSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <select onChange={(e) => handleFilter('status', e.target.value)} className="input w-44">
            <option value="">Tous les statuts</option>
            <option value="open">Ouvert</option>
            <option value="under_review">En révision</option>
            <option value="resolved_client">Résolu (client)</option>
            <option value="resolved_professional">Résolu (pro)</option>
            <option value="rejected">Rejeté</option>
          </select>
          <select onChange={(e) => handleFilter('priority', e.target.value)} className="input w-40">
            <option value="">Toutes priorités</option>
            <option value="critique">Critique (+7j)</option>
            <option value="elevee">Élevée (2–7j)</option>
            <option value="normale">Normale (&lt;2j)</option>
          </select>
        </div>

        {isLoading ? <PageSpinner /> : isError ? (
          <p className="text-center text-gray-400 py-10">Impossible de charger les litiges.</p>
        ) : (
          <>
            <Table
              columns={columns}
              data={allDisputes}
              keyExtractor={(d: AdminDispute) => d.id}
              emptyMessage="Aucun litige trouvé"
              onRowClick={(d: AdminDispute) => router.push(`/disputes/${d.id}`)}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </Card>
    </div>
  );
}
