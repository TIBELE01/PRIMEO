'use client';
import { Suspense, useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { CheckCircle, PlayCircle, XCircle, Download } from 'lucide-react';
import { supportService } from '@/services/api';
import { useTableState } from '@/hooks/useTableState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination, Column } from '@/components/ui/Table';
import { StatusTabs, TabItem } from '@/components/ui/StatusTabs';
import { FilterBar } from '@/components/ui/FilterBar';
import { BulkActionBar, BulkAction } from '@/components/ui/BulkActions';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatRelative, downloadCsv } from '@/lib/utils';
import { toneAccent } from '@/lib/status';

const STATUS_LABELS: Record<string, string> = { open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé' };
const CATEGORY_LABELS: Record<string, string> = { technical: 'Technique', dispute: 'Litige', information: 'Information', complaint: 'Réclamation' };
const PRIORITY_LABELS: Record<string, string> = { low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente' };
const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'default'> = { open: 'warning', in_progress: 'info', resolved: 'success', closed: 'default' };
const priorityVariant: Record<string, 'danger' | 'warning' | 'default' | 'info'> = { urgent: 'danger', high: 'danger', medium: 'warning', low: 'default' };

interface Ticket {
  id: string; subject: string;
  user: { firstName: string; lastName: string; email: string };
  assignee: { firstName: string; lastName: string } | null;
  category: string; status: string; priority: string; createdAt: string;
  _count: { comments: number };
}

function TicketsContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useTableState({ storageKey: 'tickets', defaultSortKey: 'createdAt', defaultSortDir: 'desc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const f = t.state.filters;
  const status = f['status'] ?? '';

  const { data, isLoading, isError, isFetching } = useQuery<any>({
    queryKey: ['tickets', t.queryParams],
    queryFn: () => supportService.listTickets(t.queryParams),
    enabled: t.hydrated,
    placeholderData: keepPreviousData,
  });

  const tickets: Ticket[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.pages ?? Math.max(Math.ceil(total / t.state.pageSize), 1);
  const counts: Record<string, number> = data?.counts ?? {};

  const tabs: TabItem[] = useMemo(() => [
    { value: '', label: 'Tous', count: counts['all'] },
    ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l, tone: statusVariant[v] ?? 'default', count: counts[v] ?? 0 })),
  ], [counts]);

  const selectedRows = tickets.filter((x) => selected.has(x.id));

  const columns: Column<Ticket>[] = [
    {
      key: 'subject', header: 'Sujet',
      render: (x) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[260px]">{x.subject}</p>
          <p className="text-xs text-gray-500">{x.user.firstName} {x.user.lastName} · {x.user.email}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Catégorie', sortable: true, render: (x) => <span className="text-xs">{CATEGORY_LABELS[x.category] ?? x.category}</span> },
    { key: 'priority', header: 'Priorité', sortable: true, render: (x) => <Badge variant={priorityVariant[x.priority] ?? 'default'}>{PRIORITY_LABELS[x.priority] ?? x.priority}</Badge> },
    { key: 'status', header: 'Statut', sortable: true, render: (x) => <Badge variant={statusVariant[x.status] ?? 'default'}>{STATUS_LABELS[x.status] ?? x.status}</Badge> },
    {
      key: 'assignee', header: 'Assigné à',
      render: (x) => (x.assignee ? <span className="text-xs">{x.assignee.firstName} {x.assignee.lastName}</span> : <span className="text-xs text-gray-400 italic">Non assigné</span>),
    },
    { key: 'comments', header: 'Messages', render: (x) => <span className="text-xs text-gray-500">{x._count.comments}</span> },
    { key: 'createdAt', header: 'Créé', sortable: true, render: (x) => <span className="text-xs text-gray-500" title={formatDate(x.createdAt)}>{formatRelative(x.createdAt)}</span> },
  ];

  const setStatusAction = (key: string, label: string, to: string, icon: React.ReactNode, variant: BulkAction<Ticket>['variant'], appliesTo: (x: Ticket) => boolean): BulkAction<Ticket> => ({
    key, label, icon, variant,
    confirmTitle: `${label} les tickets`,
    confirmMessage: `Le statut passera à « ${STATUS_LABELS[to]} » pour :`,
    appliesTo,
    run: (x) => supportService.changeStatus(x.id, to),
  });
  const actions: BulkAction<Ticket>[] = [
    setStatusAction('progress', 'Prendre en charge', 'in_progress', <PlayCircle size={14} />, 'outline', (x) => x.status === 'open'),
    setStatusAction('resolve', 'Marquer résolu', 'resolved', <CheckCircle size={14} />, 'cta', (x) => x.status === 'open' || x.status === 'in_progress'),
    setStatusAction('close', 'Fermer', 'closed', <XCircle size={14} />, 'danger', (x) => x.status !== 'closed'),
  ];

  const handleExport = () => downloadCsv(
    tickets.map((x) => ({
      id: x.id, sujet: x.subject, utilisateur: `${x.user.firstName} ${x.user.lastName}`, email: x.user.email,
      categorie: CATEGORY_LABELS[x.category] ?? x.category, priorite: PRIORITY_LABELS[x.priority] ?? x.priority,
      statut: STATUS_LABELS[x.status] ?? x.status, cree_le: formatDate(x.createdAt),
    })),
    `tickets_${status || 'tous'}_${new Date().toISOString().slice(0, 10)}`,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tickets de support</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString('fr-FR')} ticket{total > 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={!tickets.length}>Exporter la vue (CSV)</Button>
      </div>

      <Card padding={false}>
        <div className="px-4 pt-4"><StatusTabs tabs={tabs} value={status} onChange={(v) => { setSelected(new Set()); t.setFilter('status', v); }} /></div>

        <FilterBar
          search={t.state.search} onSearch={t.setSearch}
          placeholder="Sujet, nom ou email de l'utilisateur…"
          activeCount={t.activeFilterCount}
          onReset={() => { setSelected(new Set()); t.reset(); }}
        >
          <select value={f['category'] ?? ''} onChange={(e) => t.setFilter('category', e.target.value)} className="input w-40" aria-label="Catégorie">
            <option value="">Toutes catégories</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={f['priority'] ?? ''} onChange={(e) => t.setFilter('priority', e.target.value)} className="input w-40" aria-label="Priorité">
            <option value="">Toutes priorités</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Du <input type="date" value={f['from'] ?? ''} onChange={(e) => t.setFilter('from', e.target.value)} className="input !py-1.5 w-36" />
            au <input type="date" value={f['to'] ?? ''} onChange={(e) => t.setFilter('to', e.target.value)} className="input !py-1.5 w-36" />
          </label>
        </FilterBar>

        <BulkActionBar<Ticket>
          items={selectedRows} getId={(x) => x.id} getName={(x) => x.subject} actions={actions} noun="ticket"
          onClear={() => setSelected(new Set())} onDone={() => qc.invalidateQueries({ queryKey: ['tickets'] })}
        />

        {isError ? <p className="text-center text-gray-400 py-10">Impossible de charger les tickets.</p> : (
          <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
            <Table<Ticket>
              columns={columns} data={tickets} loading={isLoading || !t.hydrated} keyExtractor={(x) => x.id}
              emptyMessage="Aucun ticket ne correspond à ces filtres"
              onRowClick={(x) => router.push(`/support/tickets/${x.id}`)}
              sortKey={t.state.sortKey} sortDir={t.state.sortDir} onSort={t.setSort}
              selectable selectedIds={selected} onSelectionChange={setSelected}
              rowAccent={(x) => toneAccent[statusVariant[x.status] ?? 'default']}
            />
            <Pagination page={t.state.page} totalPages={totalPages} onPageChange={t.setPage} total={total} pageSize={t.state.pageSize} onPageSizeChange={t.setPageSize} />
          </div>
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
