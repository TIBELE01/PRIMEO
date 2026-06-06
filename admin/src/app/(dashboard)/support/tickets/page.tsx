'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supportService } from '@/services/api';
import { useDataTable } from '@/hooks/useDataTable';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, Pagination } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatRelative } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé',
};
const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technique', dispute: 'Litige', information: 'Information', complaint: 'Réclamation',
};
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente',
};

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  open: 'warning', in_progress: 'info', resolved: 'success', closed: 'default',
};
const priorityVariant: Record<string, 'danger' | 'warning' | 'default' | 'info'> = {
  urgent: 'danger', high: 'danger', medium: 'warning', low: 'default',
};

interface Ticket {
  id: string;
  subject: string;
  user: { firstName: string; lastName: string; email: string };
  assignee: { firstName: string; lastName: string } | null;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  _count: { comments: number };
}

function TicketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { queryParams, page, totalPages, handleFilter, handlePageChange, setTotalPages } = useDataTable();

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) handleFilter('status', status);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading } = useQuery<any>({
    queryKey: ['tickets', queryParams],
    queryFn: () => supportService.listTickets(queryParams),
  });

  useEffect(() => {
    if (data?.pages) setTotalPages(data.pages);
  }, [data, setTotalPages]);

  const columns = [
    {
      key: 'subject',
      header: 'Sujet',
      render: (t: Ticket) => (
        <div>
          <p className="font-medium text-gray-900 truncate max-w-[240px]">{t.subject}</p>
          <p className="text-xs text-gray-500">{t.user.firstName} {t.user.lastName}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Catégorie',
      render: (t: Ticket) => <span className="text-sm text-gray-600">{CATEGORY_LABELS[t.category] ?? t.category}</span>,
    },
    {
      key: 'priority',
      header: 'Priorité',
      render: (t: Ticket) => (
        <Badge variant={priorityVariant[t.priority] ?? 'default'}>
          {PRIORITY_LABELS[t.priority] ?? t.priority}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (t: Ticket) => (
        <Badge variant={statusVariant[t.status] ?? 'default'}>
          {STATUS_LABELS[t.status] ?? t.status}
        </Badge>
      ),
    },
    {
      key: 'assignee',
      header: 'Assigné à',
      render: (t: Ticket) => t.assignee
        ? <span className="text-sm text-gray-700">{t.assignee.firstName} {t.assignee.lastName}</span>
        : <span className="text-sm text-gray-400 italic">Non assigné</span>,
    },
    {
      key: 'createdAt',
      header: 'Ancienneté',
      render: (t: Ticket) => <span className="text-sm text-gray-500">{formatRelative(t.createdAt)}</span>,
    },
    {
      key: 'comments',
      header: 'Messages',
      render: (t: Ticket) => (
        <span className="text-sm text-gray-500">{t._count.comments}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tickets de support</h1>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <select
            onChange={(e) => handleFilter('status', e.target.value || undefined as unknown as string)}
            defaultValue={searchParams.get('status') ?? ''}
            className="input w-36"
          >
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select onChange={(e) => handleFilter('category', e.target.value || undefined as unknown as string)} className="input w-40">
            <option value="">Toutes catégories</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select onChange={(e) => handleFilter('priority', e.target.value || undefined as unknown as string)} className="input w-36">
            <option value="">Toutes priorités</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <div className="ml-auto text-sm text-gray-500 self-center">
            {data?.total !== null && data?.total !== undefined ? `${data.total} ticket${data.total > 1 ? 's' : ''}` : ''}
          </div>
        </div>

        {isLoading ? <PageSpinner /> : (
          <>
            <Table
              columns={columns}
              data={data?.data ?? []}
              keyExtractor={(t: Ticket) => t.id}
              onRowClick={(t: Ticket) => router.push(`/support/tickets/${t.id}`)}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </Card>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <TicketsContent />
    </Suspense>
  );
}
