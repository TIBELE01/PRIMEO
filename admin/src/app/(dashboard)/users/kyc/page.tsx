'use client';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, ShieldX, Home, Hotel, Building2, UtensilsCrossed } from 'lucide-react';
import { usersService } from '@/services/api';
import { useTableState } from '@/hooks/useTableState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, Pagination, Column } from '@/components/ui/Table';
import { HubCards, HubCrumbs, HubCard, hubDepth, stripAll } from '@/components/ui/Hub';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/ui/FilterBar';
import { BulkActionBar, BulkAction } from '@/components/ui/BulkActions';
import { formatDate, initials } from '@/lib/utils';
import { ACCOUNT_TYPES, accountShort, KYC_STATUS, toneAccent } from '@/lib/status';
import { PlatformUser } from '@/types/user';

type Row = PlatformUser & { kycStatus?: string | null; city?: string | null; businessName?: string | null };

const NAV = ['role', 'kyc'];
const PRO_ICON: Record<string, React.ReactNode> = {
  professional_hebergement: <Home size={20} />, professional_hotel: <Hotel size={20} />,
  professional_immobilier: <Building2 size={20} />, restaurateur: <UtensilsCrossed size={20} />,
};
const PRO_TYPES = ACCOUNT_TYPES.filter((a) => a.value !== 'client' && a.value !== 'admin');
const REJECT_REASONS = [
  'Document illisible ou de mauvaise qualité',
  'Document expiré',
  "Document ne correspond pas à l'identité déclarée",
  'Document requis manquant',
  'Informations légales incomplètes',
];

export default function KycQueuePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useTableState({ storageKey: 'kyc', defaultSortDir: 'asc', restoreFromStorage: false, pushKeys: NAV });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const kyc = t.state.filters['kyc'] ?? '';
  const role0 = t.state.filters['role'] ?? '';
  const role = role0 === 'all' ? '' : role0;
  const depth = hubDepth(t.state.filters, NAV); // 0 : types · 1 : statuts KYC · -1 : liste

  const params: Record<string, string | number> = { ...stripAll(t.queryParams, NAV), pro: 'true', withKycCounts: 'true' };
  if (depth !== -1) { params['limit'] = 1; params['page'] = 1; }

  const { data, isLoading, isError, isFetching } = useQuery<any>({
    queryKey: ['kyc-queue', params],
    queryFn: () => usersService.getUsers(params),
    enabled: t.hydrated,
    placeholderData: keepPreviousData,
  });

  const rows: Row[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.pages ?? Math.max(Math.ceil(total / t.state.pageSize), 1);
  const kycCounts: Record<string, number> = data?.kycCounts ?? {};
  const typeCounts: Record<string, number> = data?.typeCounts ?? {};

  const typeCards: HubCard[] = PRO_TYPES.map((x) => ({
    value: x.value, label: x.label, count: typeCounts[x.value] ?? 0, icon: PRO_ICON[x.value], description: 'Dossiers KYC de ce type',
  }));
  const kycCards: HubCard[] = [
    { value: 'pending', label: 'À valider', tone: 'warning', count: kycCounts['pending'] ?? 0, description: 'En attente de décision' },
    { value: 'approved', label: 'Validés', tone: 'success', count: kycCounts['approved'] ?? 0, description: 'Comptes activés' },
    { value: 'rejected', label: 'Rejetés', tone: 'danger', count: kycCounts['rejected'] ?? 0, description: 'Dossiers refusés' },
    { value: 'all', label: 'Tous les dossiers', count: kycCounts['all'] },
  ];
  const roleLabelOf = PRO_TYPES.find((x) => x.value === role)?.label ?? 'Tous les professionnels';
  const kycLabelOf = ({ pending: 'À valider', approved: 'Validés', rejected: 'Rejetés', all: 'Tous les dossiers' } as Record<string, string>)[kyc] ?? '';
  const backTo = (d: number) => {
    setSelected(new Set());
    t.setFilters({ ...(d <= 1 ? { kyc: '' } : {}), ...(d <= 0 ? { role: '' } : {}) });
    t.setSearch('');
  };

  const selectedRows = rows.filter((r) => selected.has(r.id));

  const columns: Column<Row>[] = [
    {
      key: 'firstName', header: 'Professionnel', sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">{initials(`${u.firstName} ${u.lastName}`)}</div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{u.firstName} {u.lastName}</p>
            {u.businessName && <p className="text-xs text-gray-500">{u.businessName}</p>}
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', sortable: true, render: (u) => <span className="text-xs">{u.email}</span> },
    { key: 'phone', header: 'Téléphone', render: (u) => <span className="text-xs">{u.phone ?? '—'}</span> },
    { key: 'accountType', header: 'Type', sortable: true, render: (u) => <Badge variant="info">{accountShort(u.role)}</Badge> },
    { key: 'city', header: 'Ville', render: (u) => <span className="text-xs">{u.city ?? '—'}</span> },
    { key: 'kyc', header: 'KYC', render: (u) => <StatusBadge value={u.kycStatus} map={KYC_STATUS} /> },
    { key: 'createdAt', header: 'Inscrit le', sortable: true, render: (u) => <span className="text-xs">{formatDate(u.createdAt)}</span> },
  ];

  const actions: BulkAction<Row>[] = [
    {
      key: 'approve', label: 'Valider', icon: <ShieldCheck size={14} />, variant: 'cta',
      confirmTitle: 'Valider les dossiers KYC', confirmMessage: 'Les comptes seront activés pour :',
      appliesTo: (u) => u.kycStatus !== 'approved',
      run: (u) => usersService.approveKyc(u.id),
    },
    {
      key: 'reject', label: 'Rejeter', icon: <ShieldX size={14} />, variant: 'danger',
      confirmTitle: 'Rejeter les dossiers KYC', confirmMessage: 'Le motif sera communiqué par email aux professionnels :', confirmLabel: 'Rejeter',
      reasonLabel: 'Motif du rejet', reasonPresets: REJECT_REASONS,
      appliesTo: (u) => u.kycStatus === 'pending',
      run: (u, reason) => usersService.rejectKyc(u.id, reason),
    },
  ];

  const refresh = () => { qc.invalidateQueries({ queryKey: ['kyc-queue'] }); qc.invalidateQueries({ queryKey: ['kyc-pending'] }); qc.invalidateQueries({ queryKey: ['users'] }); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/users')} className="text-gray-400 hover:text-gray-700 p-1" aria-label="Retour aux utilisateurs"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">File KYC</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString('fr-FR')} dossier{total > 1 ? 's' : ''} · ouvrez un profil pour consulter les documents avant de valider
          </p>
        </div>
      </div>

      <HubCrumbs items={[
        { label: 'File KYC', onClick: depth === 0 ? undefined : () => backTo(0) },
        ...(role0 ? [{ label: roleLabelOf, onClick: depth === 1 ? undefined : () => backTo(1) }] : []),
        ...(kyc ? [{ label: kycLabelOf }] : []),
      ]} />

      {depth === 0 && (
        <>
          <p className="text-sm text-gray-500">Choisissez un type de professionnel.</p>
          <HubCards cards={typeCards} loading={isLoading || !t.hydrated} onSelect={(v) => { setSelected(new Set()); t.setFilter('role', v); }} />
          <button type="button" onClick={() => { setSelected(new Set()); t.setFilters({ role: 'all', kyc: 'all' }); }} className="text-sm font-medium text-primary-700 hover:underline">
            Voir tous les dossiers dans une seule liste
          </button>
        </>
      )}
      {depth === 1 && (
        <>
          <p className="text-sm text-gray-500">{roleLabelOf} — choisissez l’état du dossier.</p>
          <HubCards cards={kycCards} loading={isLoading || !t.hydrated} onSelect={(v) => { setSelected(new Set()); t.setFilter('kyc', v); }} />
        </>
      )}

      {depth === -1 && (
      <Card padding={false}>

        <FilterBar
          search={t.state.search} onSearch={t.setSearch}
          placeholder="Nom, email, téléphone, entreprise…"
          activeCount={Object.entries(t.state.filters).filter(([k, v]) => !NAV.includes(k) && v).length + (t.state.search ? 1 : 0)}
          onReset={() => { setSelected(new Set()); t.reset(NAV); }}
        >
          <input type="search" value={t.state.filters['city'] ?? ''} onChange={(e) => t.setFilter('city', e.target.value)} placeholder="Ville…" className="input w-36" aria-label="Filtrer par ville" />
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Du <input type="date" value={t.state.filters['from'] ?? ''} onChange={(e) => t.setFilter('from', e.target.value)} className="input !py-1.5 w-36" />
            au <input type="date" value={t.state.filters['to'] ?? ''} onChange={(e) => t.setFilter('to', e.target.value)} className="input !py-1.5 w-36" />
          </label>
        </FilterBar>

        <BulkActionBar<Row>
          items={selectedRows} getId={(u) => u.id} getName={(u) => `${u.firstName} ${u.lastName}`.trim() || u.email} actions={actions} noun="dossier"
          onClear={() => setSelected(new Set())} onDone={refresh}
        />

        {isError ? <p className="text-center text-gray-400 py-10">Impossible de charger la file KYC.</p> : (
          <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
            <Table<Row>
              columns={columns} data={rows} loading={isLoading || !t.hydrated} keyExtractor={(u) => u.id}
              emptyMessage={kyc === 'pending' ? 'Aucun dossier KYC en attente.' : 'Aucun dossier ne correspond à ces filtres'}
              onRowClick={(u) => router.push(`/users/${u.id}`)}
              sortKey={t.state.sortKey} sortDir={t.state.sortDir} onSort={t.setSort}
              selectable selectedIds={selected} onSelectionChange={setSelected}
              rowAccent={(u) => toneAccent[KYC_STATUS[u.kycStatus ?? '']?.tone ?? 'default']}
            />
            <Pagination page={t.state.page} totalPages={totalPages} onPageChange={t.setPage} total={total} pageSize={t.state.pageSize} onPageSizeChange={t.setPageSize} />
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
