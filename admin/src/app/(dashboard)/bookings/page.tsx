'use client';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Download, XCircle } from 'lucide-react';
import { bookingsService } from '@/services/api';
import { useTableState } from '@/hooks/useTableState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination, Column } from '@/components/ui/Table';
import { StatusTabs, TabItem } from '@/components/ui/StatusTabs';
import { FilterBar } from '@/components/ui/FilterBar';
import { BulkActionBar, BulkAction } from '@/components/ui/BulkActions';
import { formatDate, formatAmount, downloadCsv } from '@/lib/utils';
import { AdminBooking } from '@/types/booking';
import { bookingStatusVariant, bookingStatusLabel, bookingStatusOptions, cancellableStatuses } from '@/lib/bookingStatus';
import { toneAccent } from '@/lib/status';
import { listOf } from '@/lib/normalize';

const PERIODS = [
  { value: '', label: 'Toute période' },
  { value: '1d', label: "Aujourd'hui" },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '90 derniers jours' },
];

export default function BookingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useTableState({ storageKey: 'bookings' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const status = t.state.filters['status'] ?? '';

  const { data, isLoading, isError, isFetching } = useQuery<any>({
    queryKey: ['bookings', t.queryParams],
    queryFn: () => bookingsService.getBookings(t.queryParams),
    enabled: t.hydrated,
    placeholderData: keepPreviousData,
  });

  const bookings: AdminBooking[] = listOf(data);
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.pages ?? Math.max(Math.ceil(total / t.state.pageSize), 1);
  const counts: Record<string, number> = data?.counts ?? {};

  const statusTabs: TabItem[] = useMemo(() => [
    { value: '', label: 'Toutes', count: counts['all'] },
    ...bookingStatusOptions.map(([v, l]) => ({ value: v, label: l, tone: bookingStatusVariant[v] ?? 'default', count: counts[v] ?? 0 })),
  ], [counts]);

  const selectedRows = bookings.filter((b) => selected.has(b.id));

  const columns: Column<AdminBooking>[] = [
    { key: 'id', header: 'Référence', render: (b) => <span className="font-mono text-xs">{b.id.slice(0, 8)}</span> },
    {
      key: 'property', header: 'Annonce',
      render: (b) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">{b.propertyTitle}</p>
          {(b as any).propertyCity && <p className="text-xs text-gray-500">{(b as any).propertyCity}</p>}
        </div>
      ),
    },
    { key: 'client', header: 'Client', render: (b) => <span className="text-xs">{b.clientName}</span> },
    {
      key: 'startDate', header: 'Séjour', sortable: true,
      render: (b) => (b.status === 'interest_expressed'
        ? <span className="text-gray-400 text-xs">—</span>
        : <span className="text-xs">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</span>),
    },
    {
      key: 'totalAmount', header: 'Montant', sortable: true,
      render: (b) => (b.status === 'interest_expressed'
        ? <span className="text-gray-400 text-xs">Sans paiement</span>
        : <span className="text-xs">{formatAmount(b.totalAmount, 'FCFA')}</span>),
    },
    { key: 'status', header: 'Statut', sortable: true, render: (b) => <Badge variant={bookingStatusVariant[b.status] ?? 'default'}>{bookingStatusLabel[b.status] ?? b.status}</Badge> },
    { key: 'createdAt', header: 'Créée le', sortable: true, render: (b) => <span className="text-xs">{formatDate(b.createdAt)}</span> },
  ];

  const actions: BulkAction<AdminBooking>[] = [
    {
      key: 'cancel', label: 'Annuler', icon: <XCircle size={14} />, variant: 'danger',
      confirmTitle: 'Annuler les réservations',
      confirmMessage: 'Les clients seront remboursés intégralement sur leur portefeuille pour :',
      confirmLabel: 'Confirmer l’annulation',
      reasonLabel: "Motif de l'annulation",
      appliesTo: (b) => cancellableStatuses.includes(b.status),
      run: (b, reason) => bookingsService.cancelBooking(b.id, reason),
    },
  ];

  const handleExport = () => downloadCsv(
    bookings.map((b) => ({
      reference: b.id, annonce: b.propertyTitle, client: b.clientName,
      arrivee: formatDate(b.checkIn), depart: formatDate(b.checkOut), montant: b.totalAmount,
      statut: bookingStatusLabel[b.status] ?? b.status, creee_le: formatDate(b.createdAt),
    })),
    `reservations_${status || 'toutes'}_${new Date().toISOString().slice(0, 10)}`,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Réservations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString('fr-FR')} réservation{total > 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={!bookings.length}>Exporter la vue (CSV)</Button>
      </div>

      <Card padding={false}>
        <div className="px-4 pt-4"><StatusTabs tabs={statusTabs} value={status} onChange={(v) => { setSelected(new Set()); t.setFilter('status', v); }} /></div>

        <FilterBar
          search={t.state.search} onSearch={t.setSearch}
          placeholder="Référence, client, annonce…"
          activeCount={t.activeFilterCount}
          onReset={() => { setSelected(new Set()); t.reset(); }}
        >
          <input type="search" value={t.state.filters['city'] ?? ''} onChange={(e) => t.setFilter('city', e.target.value)} placeholder="Ville…" className="input w-36" aria-label="Filtrer par ville" />
          <select value={t.state.filters['period'] ?? ''} onChange={(e) => t.setFilters({ period: e.target.value, from: '', to: '' })} className="input w-44" aria-label="Période de création">
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Du <input type="date" value={t.state.filters['from'] ?? ''} onChange={(e) => t.setFilters({ from: e.target.value, period: '' })} className="input !py-1.5 w-36" />
            au <input type="date" value={t.state.filters['to'] ?? ''} onChange={(e) => t.setFilters({ to: e.target.value, period: '' })} className="input !py-1.5 w-36" />
          </label>
        </FilterBar>

        <BulkActionBar<AdminBooking>
          items={selectedRows} getId={(b) => b.id} getName={(b) => `${b.id.slice(0, 8)} · ${b.propertyTitle}`} actions={actions} noun="réservation"
          onClear={() => setSelected(new Set())} onDone={() => qc.invalidateQueries({ queryKey: ['bookings'] })}
        />

        {isError ? <p className="text-center text-gray-400 py-10">Impossible de charger les réservations.</p> : (
          <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
            <Table<AdminBooking>
              columns={columns} data={bookings} loading={isLoading || !t.hydrated} keyExtractor={(b) => b.id}
              emptyMessage="Aucune réservation ne correspond à ces filtres"
              onRowClick={(b) => router.push(`/bookings/${b.id}`)}
              sortKey={t.state.sortKey} sortDir={t.state.sortDir} onSort={t.setSort}
              selectable selectedIds={selected} onSelectionChange={setSelected}
              rowAccent={(b) => toneAccent[bookingStatusVariant[b.status] ?? 'default']}
            />
            <Pagination page={t.state.page} totalPages={totalPages} onPageChange={t.setPage} total={total} pageSize={t.state.pageSize} onPageSizeChange={t.setPageSize} />
          </div>
        )}
      </Card>
    </div>
  );
}
