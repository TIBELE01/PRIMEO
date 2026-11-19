'use client';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Download, ShieldCheck, ShieldX, PauseCircle, PlayCircle, ClipboardCheck, Home, Hotel, Building2, UtensilsCrossed } from 'lucide-react';
import { propertiesService } from '@/services/api';
import { useTableState } from '@/hooks/useTableState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination, Column } from '@/components/ui/Table';
import { HubCards, HubCrumbs, HubCard, hubDepth, stripAll } from '@/components/ui/Hub';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/ui/FilterBar';
import { BulkActionBar, BulkAction } from '@/components/ui/BulkActions';
import { formatDate, formatAmount, downloadCsv } from '@/lib/utils';
import { PROPERTY_STATUS, PROPERTY_STATUS_ORDER, toneAccent } from '@/lib/status';
import { AdminProperty } from '@/types/property';

const NAV = ['sector', 'status'];
const SECTORS = [
  { value: 'residence', label: 'Résidences meublées' },
  { value: 'hotel', label: 'Hôtels' },
  { value: 'immobilier', label: 'Immobilier' },
  { value: 'restaurant', label: 'Restaurants' },
];
const PERIODS = [
  { value: '', label: 'Toute période' },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '90 derniers jours' },
];
const REJECT_REASONS = [
  'Photos insuffisantes ou de mauvaise qualité',
  'Description incomplète ou trompeuse',
  'Informations de prix ou de localisation incohérentes',
  'Annonce non conforme aux règles de la plateforme',
];

const typeLabel: Record<string, string> = {
  residence: 'Résidence', hotel: 'Hôtel', restaurant: 'Restaurant',
  immobilier_location: 'Immobilier · location', immobilier_terrain: 'Immobilier · terrain', immobilier_achat: 'Immobilier · achat',
};

export default function PropertiesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useTableState({ storageKey: 'properties', restoreFromStorage: false, pushKeys: NAV });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sector0 = t.state.filters['sector'] ?? '';
  const sector = sector0 === 'all' ? '' : sector0;
  const status = t.state.filters['status'] ?? '';

  const depth = hubDepth(t.state.filters, NAV); // 0 : secteurs · 1 : statuts · -1 : liste
  const params = stripAll(t.queryParams, NAV);
  if (depth !== -1) { params['limit'] = 1; params['page'] = 1; }

  const { data, isLoading, isError, isFetching } = useQuery<any>({
    queryKey: ['properties', params],
    queryFn: () => propertiesService.getProperties(params),
    enabled: t.hydrated,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const properties: AdminProperty[] = data?.properties ?? data?.data ?? data?.items ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.pages ?? Math.max(Math.ceil(total / t.state.pageSize), 1);
  const counts: Record<string, number> = data?.counts ?? {};
  const typeCounts: Record<string, number> = data?.typeCounts ?? {};

  const SECTOR_META: Record<string, { icon: React.ReactNode; description: string }> = {
    residence: { icon: <Home size={20} />, description: 'Appartements et résidences' },
    hotel: { icon: <Hotel size={20} />, description: 'Hôtels et établissements' },
    immobilier: { icon: <Building2 size={20} />, description: 'Location, achat, terrains' },
    restaurant: { icon: <UtensilsCrossed size={20} />, description: 'Restaurants' },
  };
  const immo = (typeCounts['immobilier_location'] ?? 0) + (typeCounts['immobilier_terrain'] ?? 0) + (typeCounts['immobilier_achat'] ?? 0);
  const sectorCount: Record<string, number> = { residence: typeCounts['residence'] ?? 0, hotel: typeCounts['hotel'] ?? 0, immobilier: immo, restaurant: typeCounts['restaurant'] ?? 0 };
  const sectorCards: HubCard[] = SECTORS.map((s0) => ({ ...s0, count: sectorCount[s0.value] ?? 0, ...SECTOR_META[s0.value] }));
  const statusCards: HubCard[] = [
    ...PROPERTY_STATUS_ORDER.map((st) => ({ value: st, label: PROPERTY_STATUS[st]!.label, tone: PROPERTY_STATUS[st]!.tone, count: counts[st] ?? 0 })),
    { value: 'all', label: 'Tous les statuts', count: counts['all'] },
  ];
  const sectorLabelOf = SECTORS.find((x) => x.value === sector)?.label ?? 'Toutes les annonces';
  const statusLabelOf = status === 'all' ? 'Tous les statuts' : PROPERTY_STATUS[status]?.label ?? '';

  const selectedRows = properties.filter((p) => selected.has(p.id));
  const refresh = () => { qc.invalidateQueries({ queryKey: ['properties'] }); qc.invalidateQueries({ queryKey: ['properties-pending'] }); };
  const choose = (key: 'sector' | 'status', value: string) => { setSelected(new Set()); t.setFilter(key, value); };
  const backTo = (d: number) => {
    setSelected(new Set());
    t.setFilters({ ...(d <= 1 ? { status: '' } : {}), ...(d <= 0 ? { sector: '' } : {}) });
    t.setSearch('');
  };

  const columns: Column<AdminProperty>[] = [
    {
      key: 'title', header: 'Annonce', sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.mainImageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.mainImageUrl} alt="" className="h-10 w-14 rounded-md object-cover bg-gray-100" />
            : <div className="h-10 w-14 rounded-md bg-gray-100 dark:bg-gray-700" />}
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">{p.title}</p>
            <p className="text-xs text-gray-500">{p.ownerName}</p>
          </div>
        </div>
      ),
    },
    { key: 'propertyType', header: 'Type', sortable: true, render: (p) => <Badge variant="info">{typeLabel[p.type as string] ?? p.type}</Badge> },
    { key: 'city', header: 'Ville', sortable: true, render: (p) => <span className="text-xs">{p.city || '—'}</span> },
    { key: 'pricePerNight', header: 'Prix', sortable: true, render: (p) => <span className="text-xs">{p.pricePerNight ? formatAmount(p.pricePerNight, 'FCFA') : '—'}</span> },
    { key: 'status', header: 'Statut', sortable: true, render: (p) => <StatusBadge value={p.status} map={PROPERTY_STATUS} /> },
    { key: 'boosted', header: 'Boost', render: (p) => (p.isBoosted ? <Badge variant="success">Oui</Badge> : <span className="text-gray-400">—</span>) },
    { key: 'createdAt', header: 'Soumise le', sortable: true, render: (p) => <span className="text-xs">{formatDate(p.submittedAt)}</span> },
  ];

  const actions: BulkAction<AdminProperty>[] = [
    {
      key: 'approve', label: 'Valider', icon: <ShieldCheck size={14} />, variant: 'cta',
      confirmTitle: 'Valider les annonces', confirmMessage: 'Les annonces seront publiées :',
      appliesTo: (p) => p.status === 'pending_review',
      run: (p) => propertiesService.approveProperty(p.id),
    },
    {
      key: 'reject', label: 'Rejeter', icon: <ShieldX size={14} />, variant: 'outline',
      confirmTitle: 'Rejeter les annonces', confirmMessage: 'Le motif sera communiqué aux propriétaires :', confirmLabel: 'Rejeter',
      reasonLabel: 'Motif du rejet', reasonPresets: REJECT_REASONS,
      appliesTo: (p) => p.status === 'pending_review',
      run: (p, reason) => propertiesService.rejectProperty(p.id, reason),
    },
    {
      key: 'reactivate', label: 'Réactiver', icon: <PlayCircle size={14} />, variant: 'outline',
      confirmTitle: 'Réactiver les annonces', confirmMessage: 'Les annonces suspendues seront de nouveau visibles :',
      appliesTo: (p) => p.status === 'suspended',
      run: (p) => propertiesService.reactivateProperty(p.id),
    },
    {
      key: 'suspend', label: 'Suspendre', icon: <PauseCircle size={14} />, variant: 'danger',
      confirmTitle: 'Suspendre les annonces', confirmMessage: 'Ces annonces ne seront plus visibles des clients :', confirmLabel: 'Suspendre',
      reasonLabel: 'Motif de la suspension',
      appliesTo: (p) => p.status === 'active',
      run: (p, reason) => propertiesService.suspendWithReason(p.id, reason),
    },
  ];

  const handleExport = () => downloadCsv(
    properties.map((p) => ({
      id: p.id, titre: p.title, type: typeLabel[p.type as string] ?? p.type, ville: p.city, proprietaire: p.ownerName,
      prix: p.pricePerNight, statut: PROPERTY_STATUS[p.status]?.label ?? p.status, soumise_le: formatDate(p.submittedAt),
    })),
    `annonces_${sector || 'toutes'}_${status || 'tous'}_${new Date().toISOString().slice(0, 10)}`,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Propriétés</h1>
          <div className="mt-1">
            <HubCrumbs items={[
              { label: 'Propriétés', onClick: depth === 0 ? undefined : () => backTo(0) },
              ...(sector0 ? [{ label: sectorLabelOf, onClick: depth === 1 ? undefined : () => backTo(1) }] : []),
              ...(status ? [{ label: statusLabelOf }] : []),
            ]} />
          </div>
        </div>
        <div className="flex gap-2">
          {depth === -1 && <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={!properties.length}>Exporter la vue (CSV)</Button>}
          <Button size="sm" leftIcon={<ClipboardCheck size={14} />} onClick={() => router.push('/properties/pending')}>Modération</Button>
        </div>
      </div>

      {depth === 0 && (
        <>
          <p className="text-sm text-gray-500">Choisissez un secteur.</p>
          <HubCards cards={sectorCards} loading={isLoading || !t.hydrated} onSelect={(v) => choose('sector', v)} />
          <button type="button" onClick={() => { setSelected(new Set()); t.setFilters({ sector: 'all', status: 'all' }); }} className="text-sm font-medium text-primary-700 hover:underline">
            Voir toutes les annonces dans une seule liste
          </button>
        </>
      )}
      {depth === 1 && (
        <>
          <p className="text-sm text-gray-500">{sectorLabelOf} — choisissez un statut.</p>
          <HubCards cards={statusCards} loading={isLoading || !t.hydrated} onSelect={(v) => choose('status', v)} />
        </>
      )}

      {depth === -1 && (
      <Card padding={false}>
        <FilterBar
          search={t.state.search} onSearch={t.setSearch}
          placeholder="Rechercher par titre, ville ou propriétaire…"
          activeCount={Object.entries(t.state.filters).filter(([k, v]) => !NAV.includes(k) && v).length + (t.state.search ? 1 : 0)}
          onReset={() => { setSelected(new Set()); t.reset(NAV); }}
        >
          <input
            type="search" value={t.state.filters['city'] ?? ''} onChange={(e) => t.setFilter('city', e.target.value)}
            placeholder="Ville…" className="input w-36" aria-label="Filtrer par ville"
          />
          <select value={t.state.filters['period'] ?? ''} onChange={(e) => t.setFilters({ period: e.target.value, from: '', to: '' })} className="input w-44" aria-label="Période de soumission">
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Du <input type="date" value={t.state.filters['from'] ?? ''} onChange={(e) => t.setFilters({ from: e.target.value, period: '' })} className="input !py-1.5 w-36" />
            au <input type="date" value={t.state.filters['to'] ?? ''} onChange={(e) => t.setFilters({ to: e.target.value, period: '' })} className="input !py-1.5 w-36" />
          </label>
        </FilterBar>

        <BulkActionBar<AdminProperty>
          items={selectedRows} getId={(p) => p.id} getName={(p) => p.title} actions={actions} noun="annonce"
          onClear={() => setSelected(new Set())} onDone={refresh}
        />

        {isError ? <p className="text-center text-gray-400 py-10">Impossible de charger les propriétés.</p> : (
          <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
            <Table<AdminProperty>
              columns={columns} data={properties} loading={isLoading || !t.hydrated} keyExtractor={(p) => p.id}
              emptyMessage="Aucune annonce ne correspond à ces filtres"
              onRowClick={(p) => router.push(`/properties/${p.id}`)}
              sortKey={t.state.sortKey} sortDir={t.state.sortDir} onSort={t.setSort}
              selectable selectedIds={selected} onSelectionChange={setSelected}
              rowAccent={(p) => toneAccent[PROPERTY_STATUS[p.status]?.tone ?? 'default']}
            />
            <Pagination page={t.state.page} totalPages={totalPages} onPageChange={t.setPage} total={total} pageSize={t.state.pageSize} onPageSizeChange={t.setPageSize} />
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
