'use client';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { CheckCircle, XCircle, ImageOff, Download } from 'lucide-react';
import { menuItemsService } from '@/services/api';
import { useTableState } from '@/hooks/useTableState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination, Column } from '@/components/ui/Table';
import { HubCards, HubCrumbs, HubCard, hubDepth } from '@/components/ui/Hub';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/ui/FilterBar';
import { BulkActionBar, BulkAction } from '@/components/ui/BulkActions';
import { formatDate, formatAmount, downloadCsv } from '@/lib/utils';
import { MENU_STATUS, toneAccent } from '@/lib/status';

interface MenuItem {
  id: string;
  name: string;
  section: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  status: string;
  rejectionReason?: string | null;
  createdAt: string;
  property: { id: string; title: string; owner?: { firstName: string; lastName: string; email: string } };
}

const REJECT_REASONS = [
  'Photo absente ou de mauvaise qualité',
  'Description insuffisante',
  'Prix incohérent',
  'Contenu non conforme aux règles de la plateforme',
];

const NAV = ['status'];

export default function MenuItemsPage() {
  const qc = useQueryClient();
  const t = useTableState({ storageKey: 'menu-items', defaultSortKey: 'createdAt', defaultSortDir: 'asc', restoreFromStorage: false, pushKeys: NAV });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const status = t.state.filters['status'] ?? '';

  const depth = hubDepth(t.state.filters, NAV);
  const params: Record<string, string | number> = { ...t.queryParams }; // l'API gère « all » elle-même
  if (depth !== -1) { params['limit'] = 1; params['page'] = 1; params['status'] = 'all'; }

  const { data, isLoading, isError, isFetching } = useQuery<any>({
    queryKey: ['menu-items', params],
    queryFn: () => menuItemsService.getPending(params),
    enabled: t.hydrated,
    placeholderData: keepPreviousData,
  });

  const items: MenuItem[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.pages ?? Math.max(Math.ceil(total / t.state.pageSize), 1);
  const counts: Record<string, number> = data?.counts ?? {};

  const statusCards: HubCard[] = useMemo(() => [
    { value: 'pending', label: 'En attente', tone: 'warning', count: counts['pending'] ?? 0, description: 'À valider ou rejeter' },
    { value: 'approved', label: 'Validés', tone: 'success', count: counts['approved'] ?? 0, description: 'Visibles des clients' },
    { value: 'rejected', label: 'Rejetés', tone: 'danger', count: counts['rejected'] ?? 0, description: 'Refusés avec motif' },
    { value: 'all', label: 'Tous les plats', count: counts['all'] },
  ], [counts]);
  const statusLabelOf = ({ pending: 'En attente', approved: 'Validés', rejected: 'Rejetés', all: 'Tous les plats' } as Record<string, string>)[status] ?? '';
  const backTo = () => { setSelected(new Set()); t.setFilter('status', ''); t.setSearch(''); };


  const selectedRows = items.filter((i) => selected.has(i.id));

  const columns: Column<MenuItem>[] = [
    {
      key: 'name', header: 'Plat', sortable: true,
      render: (it) => (
        <div className="flex items-center gap-3">
          <div className="h-11 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            {it.photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={it.photoUrl} alt={it.name} className="h-full w-full object-cover" />
              : <ImageOff size={18} className="text-gray-300" />}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{it.name}</p>
            {it.description && <p className="text-xs text-gray-500 max-w-xs truncate">{it.description}</p>}
          </div>
        </div>
      ),
    },
    { key: 'section', header: 'Section', sortable: true, render: (it) => <Badge variant="info">{it.section}</Badge> },
    { key: 'price', header: 'Prix', sortable: true, render: (it) => <span className="text-xs">{formatAmount(it.price, 'FCFA')}</span> },
    {
      key: 'restaurant', header: 'Restaurant',
      render: (it) => (
        <div>
          <p className="text-xs font-medium">{it.property?.title}</p>
          {it.property?.owner && <p className="text-xs text-gray-500">{it.property.owner.firstName} {it.property.owner.lastName}</p>}
        </div>
      ),
    },
    {
      key: 'status', header: 'Statut', sortable: true,
      render: (it) => (
        <div>
          <StatusBadge value={it.status} map={MENU_STATUS} />
          {it.status === 'rejected' && it.rejectionReason && <p className="text-xs text-gray-500 mt-1 max-w-[12rem] truncate" title={it.rejectionReason}>{it.rejectionReason}</p>}
        </div>
      ),
    },
    { key: 'createdAt', header: 'Soumis le', sortable: true, render: (it) => <span className="text-xs">{formatDate(it.createdAt)}</span> },
  ];

  const actions: BulkAction<MenuItem>[] = [
    {
      key: 'approve', label: 'Valider', icon: <CheckCircle size={14} />, variant: 'cta',
      confirmTitle: 'Valider les plats', confirmMessage: 'Les plats deviendront visibles des clients :',
      appliesTo: (it) => it.status !== 'approved',
      run: (it) => menuItemsService.approve(it.id),
    },
    {
      key: 'reject', label: 'Rejeter', icon: <XCircle size={14} />, variant: 'danger',
      confirmTitle: 'Rejeter les plats', confirmMessage: 'Le motif sera communiqué aux restaurateurs :', confirmLabel: 'Rejeter',
      reasonLabel: 'Motif du rejet', reasonPresets: REJECT_REASONS,
      appliesTo: (it) => it.status !== 'rejected',
      run: (it, reason) => menuItemsService.reject(it.id, reason),
    },
  ];

  const handleExport = () => downloadCsv(
    items.map((i) => ({
      id: i.id, plat: i.name, section: i.section, prix: i.price, restaurant: i.property?.title,
      statut: MENU_STATUS[i.status]?.label ?? i.status, soumis_le: formatDate(i.createdAt),
    })),
    `plats_${status}_${new Date().toISOString().slice(0, 10)}`,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Plats</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString('fr-FR')} plat{total > 1 ? 's' : ''} · modération des menus de restaurant</p>
        </div>
        {depth === -1 && <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={!items.length}>Exporter la vue (CSV)</Button>}
      </div>

      <div className="-mt-2"><HubCrumbs items={[
        { label: 'Plats', onClick: depth === 0 ? undefined : () => backTo() },
        ...(status ? [{ label: statusLabelOf }] : []),
      ]} /></div>

      {depth === 0 && (
        <>
          <p className="text-sm text-gray-500">Choisissez un statut de plat.</p>
          <HubCards cards={statusCards} loading={isLoading || !t.hydrated} onSelect={(v) => { setSelected(new Set()); t.setFilter('status', v); }} />
        </>
      )}


      {depth === -1 && (
      <Card padding={false}>
        <FilterBar
          search={t.state.search} onSearch={t.setSearch}
          placeholder="Plat, section, restaurant, propriétaire…"
          activeCount={Object.entries(t.state.filters).filter(([k, v]) => k !== 'status' && v).length + (t.state.search ? 1 : 0)}
          onReset={() => { setSelected(new Set()); t.reset(NAV); }}
        >
          <input type="search" value={t.state.filters['section'] ?? ''} onChange={(e) => t.setFilter('section', e.target.value)} placeholder="Section (Entrées, Plats…)" className="input w-48" aria-label="Filtrer par section" />
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Du <input type="date" value={t.state.filters['from'] ?? ''} onChange={(e) => t.setFilter('from', e.target.value)} className="input !py-1.5 w-36" />
            au <input type="date" value={t.state.filters['to'] ?? ''} onChange={(e) => t.setFilter('to', e.target.value)} className="input !py-1.5 w-36" />
          </label>
        </FilterBar>

        <BulkActionBar<MenuItem>
          items={selectedRows} getId={(i) => i.id} getName={(i) => i.name} actions={actions} noun="plat"
          onClear={() => setSelected(new Set())} onDone={() => qc.invalidateQueries({ queryKey: ['menu-items'] })}
        />

        {isError ? <p className="text-center text-gray-400 py-10">Impossible de charger les plats.</p> : (
          <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
            <Table<MenuItem>
              columns={columns} data={items} loading={isLoading || !t.hydrated} keyExtractor={(i) => i.id}
              emptyMessage={status === 'pending' ? 'Aucun plat en attente de modération.' : 'Aucun plat ne correspond à ces filtres'}
              sortKey={t.state.sortKey} sortDir={t.state.sortDir} onSort={t.setSort}
              selectable selectedIds={selected} onSelectionChange={setSelected}
              rowAccent={(i) => toneAccent[MENU_STATUS[i.status]?.tone ?? 'default']}
            />
            <Pagination page={t.state.page} totalPages={totalPages} onPageChange={t.setPage} total={total} pageSize={t.state.pageSize} onPageSizeChange={t.setPageSize} />
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
