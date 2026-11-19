'use client';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Download, XCircle } from 'lucide-react';
import { disputesService } from '@/services/api';
import { useTableState } from '@/hooks/useTableState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination, Column } from '@/components/ui/Table';
import { HubCards, HubCrumbs, HubCard, hubDepth, stripAll } from '@/components/ui/Hub';
import { FilterBar } from '@/components/ui/FilterBar';
import { BulkActionBar, BulkAction } from '@/components/ui/BulkActions';
import { formatDate, formatAmount, downloadCsv } from '@/lib/utils';
import { AdminDispute } from '@/types/dispute';
import { disputeStatusVariant, disputeStatusLabel, disputeStatusOptions } from '@/lib/disputeStatus';
import { toneAccent } from '@/lib/status';
import { listOf } from '@/lib/normalize';

const ageDays = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
function priorityOf(days: number): { label: string; variant: 'danger' | 'warning' | 'default' } {
  if (days >= 7) return { label: 'Critique', variant: 'danger' };
  if (days >= 2) return { label: 'Élevée', variant: 'warning' };
  return { label: 'Normale', variant: 'default' };
}
const PERIODS = [
  { value: '', label: 'Toute période' },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '90 derniers jours' },
];
const OPEN = ['open', 'under_review'];

const NAV = ['status'];

export default function DisputesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useTableState({ storageKey: 'disputes', restoreFromStorage: false, pushKeys: NAV });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const status = t.state.filters['status'] ?? '';

  const depth = hubDepth(t.state.filters, NAV);
  const params = stripAll(t.queryParams, NAV);
  if (depth !== -1) { params['limit'] = 1; params['page'] = 1; }

  const { data, isLoading, isError, isFetching } = useQuery<any>({
    queryKey: ['disputes', params],
    queryFn: () => disputesService.getDisputes(params),
    enabled: t.hydrated,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const disputes: AdminDispute[] = listOf(data);
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.pages ?? Math.max(Math.ceil(total / t.state.pageSize), 1);
  const counts: Record<string, number> = data?.counts ?? {};

  const statusCards: HubCard[] = useMemo(() => [
    ...([['open', 'Ouvert'], ['under_review', 'En révision'], ...disputeStatusOptions.filter(([v]) => v !== 'open'), ['closed', 'Fermé']] as Array<[string, string]>).map(([v, l]) => ({ value: v, label: l, tone: disputeStatusVariant[v] ?? 'default', count: counts[v] ?? 0 })),
    { value: 'all', label: 'Tous les litiges', count: counts['all'] },
  ], [counts]);
  const statusLabelOf = status === 'all' ? 'Tous les litiges' : disputeStatusLabel[status] ?? '';
  const backTo = () => { setSelected(new Set()); t.setFilter('status', ''); t.setSearch(''); };


  const selectedRows = disputes.filter((d) => selected.has(d.id));

  const columns: Column<AdminDispute>[] = [
    {
      key: 'priority', header: 'Priorité',
      render: (d) => {
        if (!OPEN.includes(d.status)) return <span className="text-xs text-gray-400">—</span>;
        const p = priorityOf(ageDays(d.createdAt));
        return <Badge variant={p.variant}>{p.label}</Badge>;
      },
    },
    {
      key: 'reason', header: 'Objet',
      render: (d) => (
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">{d.reason}</p>
          {d.propertyTitle && <p className="text-xs text-gray-400 max-w-xs truncate">{d.propertyTitle}</p>}
        </div>
      ),
    },
    { key: 'clientName', header: 'Client', render: (d) => <span className="text-xs">{d.clientName}</span> },
    { key: 'professionalName', header: 'Professionnel', render: (d) => <span className="text-xs">{d.professionalName}</span> },
    {
      key: 'requestedRefundAmount', header: 'Remb. demandé',
      render: (d) => (d.requestedRefundAmount ? <span className="text-xs font-medium">{formatAmount(d.requestedRefundAmount, 'FCFA')}</span> : <span className="text-gray-400 text-xs">—</span>),
    },
    { key: 'status', header: 'Statut', sortable: true, render: (d) => <Badge variant={disputeStatusVariant[d.status] ?? 'default'}>{disputeStatusLabel[d.status] ?? d.status}</Badge> },
    {
      key: 'createdAt', header: 'Ouvert le', sortable: true,
      render: (d) => {
        const days = ageDays(d.createdAt);
        const late = OPEN.includes(d.status) && days >= 7;
        return <span className={`text-xs ${late ? 'text-danger-600 font-semibold' : ''}`}>{formatDate(d.createdAt)} · {days}j</span>;
      },
    },
  ];

  const actions: BulkAction<AdminDispute>[] = [
    {
      key: 'close', label: 'Clore sans remboursement', icon: <XCircle size={14} />, variant: 'danger',
      confirmTitle: 'Clore les litiges sans remboursement',
      confirmMessage: 'Les litiges seront rejetés, sans aucun remboursement, pour :',
      confirmLabel: 'Confirmer la clôture',
      reasonLabel: 'Note de clôture (communiquée aux parties)',
      appliesTo: (d) => OPEN.includes(d.status),
      run: (d, reason) => disputesService.reject(d.id, reason),
    },
  ];

  const handleExport = () => downloadCsv(
    disputes.map((d) => ({
      id: d.id, objet: d.reason, annonce: d.propertyTitle, client: d.clientName, professionnel: d.professionalName,
      remboursement_demande: d.requestedRefundAmount ?? '', statut: disputeStatusLabel[d.status] ?? d.status, ouvert_le: formatDate(d.createdAt),
    })),
    `litiges_${status || 'tous'}_${new Date().toISOString().slice(0, 10)}`,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Litiges</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString('fr-FR')} litige{total > 1 ? 's' : ''} · conflits entre clients et professionnels
          </p>
        </div>
        {depth === -1 && <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={!disputes.length}>Exporter la vue (CSV)</Button>}
      </div>

      <div className="-mt-2"><HubCrumbs items={[
        { label: 'Litiges', onClick: depth === 0 ? undefined : () => backTo() },
        ...(status ? [{ label: statusLabelOf }] : []),
      ]} /></div>

      {depth === 0 && (
        <>
          <p className="text-sm text-gray-500">Choisissez un statut de litige.</p>
          <HubCards cards={statusCards} loading={isLoading || !t.hydrated} onSelect={(v) => { setSelected(new Set()); t.setFilter('status', v); }} />
        </>
      )}


      {depth === -1 && (
      <Card padding={false}>
        <FilterBar
          search={t.state.search} onSearch={t.setSearch}
          placeholder="Client, professionnel, annonce, objet…"
          activeCount={Object.entries(t.state.filters).filter(([k, v]) => !NAV.includes(k) && v).length + (t.state.search ? 1 : 0)}
          onReset={() => { setSelected(new Set()); t.reset(NAV); }}
        >
          <select value={t.state.filters['priority'] ?? ''} onChange={(e) => t.setFilter('priority', e.target.value)} className="input w-44" aria-label="Priorité">
            <option value="">Toutes priorités</option>
            <option value="critique">Critique (+7 j)</option>
            <option value="elevee">Élevée (2–7 j)</option>
            <option value="normale">Normale (&lt; 2 j)</option>
          </select>
          <select value={t.state.filters['period'] ?? ''} onChange={(e) => t.setFilters({ period: e.target.value, from: '', to: '' })} className="input w-44" aria-label="Période">
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Du <input type="date" value={t.state.filters['from'] ?? ''} onChange={(e) => t.setFilters({ from: e.target.value, period: '' })} className="input !py-1.5 w-36" />
            au <input type="date" value={t.state.filters['to'] ?? ''} onChange={(e) => t.setFilters({ to: e.target.value, period: '' })} className="input !py-1.5 w-36" />
          </label>
        </FilterBar>

        <BulkActionBar<AdminDispute>
          items={selectedRows} getId={(d) => d.id} getName={(d) => d.reason} actions={actions} noun="litige"
          onClear={() => setSelected(new Set())} onDone={() => qc.invalidateQueries({ queryKey: ['disputes'] })}
        />

        {isError ? <p className="text-center text-gray-400 py-10">Impossible de charger les litiges.</p> : (
          <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
            <Table<AdminDispute>
              columns={columns} data={disputes} loading={isLoading || !t.hydrated} keyExtractor={(d) => d.id}
              emptyMessage="Aucun litige ne correspond à ces filtres"
              onRowClick={(d) => router.push(`/disputes/${d.id}`)}
              sortKey={t.state.sortKey} sortDir={t.state.sortDir} onSort={t.setSort}
              selectable selectedIds={selected} onSelectionChange={setSelected}
              rowAccent={(d) => toneAccent[disputeStatusVariant[d.status] ?? 'default']}
            />
            <Pagination page={t.state.page} totalPages={totalPages} onPageChange={t.setPage} total={total} pageSize={t.state.pageSize} onPageSizeChange={t.setPageSize} />
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
