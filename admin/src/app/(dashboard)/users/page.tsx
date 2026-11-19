'use client';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Download, ShieldCheck, ShieldX, Ban, PauseCircle, PlayCircle, UserCheck } from 'lucide-react';
import { usersService } from '@/services/api';
import { useTableState } from '@/hooks/useTableState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination, Column } from '@/components/ui/Table';
import { StatusTabs, TabItem } from '@/components/ui/StatusTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/ui/FilterBar';
import { BulkActionBar, BulkAction } from '@/components/ui/BulkActions';
import { formatDate, initials, downloadCsv } from '@/lib/utils';
import { ACCOUNT_TYPES, accountShort, KYC_STATUS, USER_STATUS, USER_STATUS_ORDER, toneAccent } from '@/lib/status';
import { PlatformUser } from '@/types/user';

type Row = PlatformUser & { displayStatus: string; kycStatus?: string | null; city?: string | null; businessName?: string | null };

const planLabel: Record<string, string> = { starter: 'Starter', business: 'Business', entreprise: 'Entreprise' };
const planVariant: Record<string, 'default' | 'info' | 'success'> = { starter: 'default', business: 'info', entreprise: 'success' };

const PERIODS = [
  { value: '', label: 'Toute période' },
  { value: '1d', label: "Aujourd'hui" },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '90 derniers jours' },
];

const isPro = (u: Row) => u.role !== 'client' && u.role !== 'admin';

const REJECT_REASONS = [
  'Document illisible ou de mauvaise qualité',
  'Document expiré',
  "Document ne correspond pas à l'identité déclarée",
  'Informations légales incomplètes',
];

export default function UsersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const t = useTableState({ storageKey: 'users' });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const role = t.state.filters['role'] ?? '';
  const status = t.state.filters['status'] ?? '';

  const { data, isLoading, isError, isFetching } = useQuery<any>({
    queryKey: ['users', t.queryParams],
    queryFn: () => usersService.getUsers(t.queryParams),
    enabled: t.hydrated,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const users: Row[] = data?.users ?? data?.data ?? data?.items ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.pages ?? Math.max(Math.ceil(total / t.state.pageSize), 1);
  const counts: Record<string, number> = data?.counts ?? {};
  const typeCounts: Record<string, number> = data?.typeCounts ?? {};

  const typeTabs: TabItem[] = useMemo(() => [
    { value: '', label: 'Tous', count: Object.values(typeCounts).reduce((a, b) => a + b, 0) },
    ...ACCOUNT_TYPES.map((a) => ({ value: a.value, label: a.label, count: typeCounts[a.value] ?? 0 })),
  ], [typeCounts]);

  const statusTabs: TabItem[] = useMemo(() => [
    { value: '', label: 'Tous', count: counts['all'] },
    ...USER_STATUS_ORDER.map((s) => ({ value: s, label: USER_STATUS[s]!.label, tone: USER_STATUS[s]!.tone, count: counts[s] ?? 0 })),
  ], [counts]);

  const selectedRows = users.filter((u) => selected.has(u.id));
  const refresh = () => { qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['kyc-pending'] }); };

  const changeTab = (key: 'role' | 'status', value: string) => { setSelected(new Set()); t.setFilter(key, value); };

  const handleExport = () => {
    downloadCsv(
      users.map((u) => ({
        id: u.id,
        prenom: u.firstName,
        nom: u.lastName,
        email: u.email,
        telephone: u.phone,
        type_de_compte: accountShort(u.role),
        ville: u.city ?? '',
        formule: u.subscription?.planType ? (planLabel[u.subscription.planType.toLowerCase()] ?? u.subscription.planType) : '',
        statut: USER_STATUS[u.displayStatus]?.label ?? u.displayStatus,
        kyc: u.kycStatus ? (KYC_STATUS[u.kycStatus]?.label ?? u.kycStatus) : '',
        inscription: formatDate(u.createdAt),
      })),
      `utilisateurs_${role || 'tous'}_${status || 'tous'}_${new Date().toISOString().slice(0, 10)}`,
    );
  };

  const columns: Column<Row>[] = [
    {
      key: 'firstName', header: 'Nom', sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {initials(`${u.firstName} ${u.lastName}`)}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{u.firstName} {u.lastName}</p>
            {u.businessName && <p className="text-xs text-gray-500">{u.businessName}</p>}
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', sortable: true, render: (u) => <span className="text-xs">{u.email}</span> },
    { key: 'phone', header: 'Téléphone', render: (u) => <span className="text-xs">{u.phone ?? '—'}</span> },
    ...(role === '' ? [{ key: 'accountType', header: 'Type', sortable: true, render: (u: Row) => <Badge variant="info">{accountShort(u.role)}</Badge> }] : []),
    ...(role !== 'client' && role !== 'admin' ? [{ key: 'city', header: 'Ville', render: (u: Row) => <span className="text-xs">{u.city ?? '—'}</span> }] : []),
    ...(role !== 'client' && role !== 'admin' ? [{
      key: 'kyc', header: 'KYC',
      render: (u: Row) => (isPro(u) ? <StatusBadge value={u.kycStatus} map={KYC_STATUS} /> : <span className="text-xs text-gray-400">—</span>),
    }] : []),
    ...(role !== 'client' && role !== 'admin' ? [{
      key: 'subscription', header: 'Formule',
      render: (u: Row) => {
        const plan = u.subscription?.planType?.toLowerCase() ?? '';
        return plan ? <Badge variant={planVariant[plan] ?? 'default'}>{planLabel[plan] ?? plan}</Badge> : <span className="text-xs text-gray-400">—</span>;
      },
    }] : []),
    { key: 'status', header: 'Statut', sortable: true, render: (u) => <StatusBadge value={u.displayStatus} map={USER_STATUS} /> },
    { key: 'createdAt', header: 'Inscription', sortable: true, render: (u) => <span className="text-xs">{formatDate(u.createdAt)}</span> },
  ];

  // Actions groupées — mêmes routes métier que la fiche utilisateur
  const actions: BulkAction<Row>[] = [
    {
      key: 'approve', label: 'Valider', icon: <ShieldCheck size={14} />, variant: 'cta',
      confirmTitle: 'Valider les comptes professionnels',
      confirmMessage: 'Le dossier KYC sera approuvé et le compte activé pour',
      appliesTo: (u) => isPro(u) && (u.displayStatus === 'pending' || u.displayStatus === 'rejected'),
      run: (u) => usersService.approveKyc(u.id),
    },
    {
      key: 'reject', label: 'Rejeter', icon: <ShieldX size={14} />, variant: 'outline',
      confirmTitle: 'Rejeter le dossier KYC',
      confirmMessage: 'Le motif sera communiqué par email aux professionnels :',
      confirmLabel: 'Rejeter',
      reasonLabel: 'Motif du rejet', reasonPresets: REJECT_REASONS,
      appliesTo: (u) => isPro(u) && u.displayStatus === 'pending',
      run: (u, reason) => usersService.rejectKyc(u.id, reason),
    },
    {
      key: 'reactivate', label: 'Réactiver', icon: <PlayCircle size={14} />, variant: 'outline',
      confirmTitle: 'Réactiver les comptes',
      confirmMessage: 'Les comptes suspendus retrouveront leur accès :',
      appliesTo: (u) => u.displayStatus === 'suspended' && u.role !== 'admin',
      run: (u) => usersService.reactivate(u.id),
    },
    {
      key: 'suspend', label: 'Suspendre', icon: <PauseCircle size={14} />, variant: 'outline',
      confirmTitle: 'Suspendre les comptes',
      confirmMessage: 'Ces comptes perdront temporairement leur accès :',
      confirmLabel: 'Suspendre',
      reasonLabel: 'Motif de la suspension',
      appliesTo: (u) => u.role !== 'admin' && (u.displayStatus === 'active' || u.displayStatus === 'pending' || u.displayStatus === 'rejected'),
      run: (u, reason) => usersService.suspend(u.id, reason),
    },
    {
      key: 'ban', label: 'Bannir', icon: <Ban size={14} />, variant: 'danger',
      confirmTitle: 'Bannir définitivement les comptes',
      confirmMessage: 'Action irréversible : ces utilisateurs perdront l’accès à la plateforme :',
      confirmLabel: 'Confirmer le bannissement',
      reasonLabel: 'Motif du bannissement',
      appliesTo: (u) => u.role !== 'admin' && u.displayStatus !== 'banned',
      run: (u, reason) => usersService.banUser(u.id, reason),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString('fr-FR')} compte{total > 1 ? 's' : ''}
            {role ? ` · ${ACCOUNT_TYPES.find((a) => a.value === role)?.label}` : ''}
            {status ? ` · ${USER_STATUS[status]?.label}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={!users.length}>Exporter la vue (CSV)</Button>
          <Button size="sm" leftIcon={<UserCheck size={14} />} onClick={() => router.push('/users/kyc')}>File KYC</Button>
        </div>
      </div>

      <Card padding={false}>
        <div className="px-4 pt-2">
          <StatusTabs variant="underline" tabs={typeTabs} value={role} onChange={(v) => changeTab('role', v)} />
        </div>
        <div className="px-4 pt-3">
          <StatusTabs tabs={statusTabs} value={status} onChange={(v) => changeTab('status', v)} />
        </div>

        <FilterBar
          search={t.state.search}
          onSearch={t.setSearch}
          placeholder="Rechercher par nom, email ou téléphone…"
          activeCount={t.activeFilterCount}
          onReset={() => { setSelected(new Set()); t.reset(); }}
        >
          {role !== 'client' && role !== 'admin' && (
            <input
              type="search"
              value={t.state.filters['city'] ?? ''}
              onChange={(e) => t.setFilter('city', e.target.value)}
              placeholder="Ville…"
              className="input w-36"
              aria-label="Filtrer par ville"
            />
          )}
          <select value={t.state.filters['period'] ?? ''} onChange={(e) => t.setFilters({ period: e.target.value, from: '', to: '' })} className="input w-44" aria-label="Période d'inscription">
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Du
            <input type="date" value={t.state.filters['from'] ?? ''} onChange={(e) => t.setFilters({ from: e.target.value, period: '' })} className="input !py-1.5 w-36" />
            au
            <input type="date" value={t.state.filters['to'] ?? ''} onChange={(e) => t.setFilters({ to: e.target.value, period: '' })} className="input !py-1.5 w-36" />
          </label>
        </FilterBar>

        <BulkActionBar<Row>
          items={selectedRows}
          getId={(u) => u.id}
          getName={(u) => `${u.firstName} ${u.lastName}`.trim() || u.email}
          actions={actions}
          noun="compte"
          onClear={() => setSelected(new Set())}
          onDone={refresh}
        />

        {isError ? (
          <p className="text-center text-gray-400 py-10">Impossible de charger les utilisateurs.</p>
        ) : (
          <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
            <Table<Row>
              columns={columns}
              data={users}
              loading={isLoading || !t.hydrated}
              keyExtractor={(u) => u.id}
              emptyMessage="Aucun compte ne correspond à ces filtres"
              onRowClick={(u) => router.push(`/users/${u.id}`)}
              sortKey={t.state.sortKey}
              sortDir={t.state.sortDir}
              onSort={t.setSort}
              selectable
              selectedIds={selected}
              onSelectionChange={setSelected}
              rowAccent={(u) => toneAccent[USER_STATUS[u.displayStatus]?.tone ?? 'default']}
            />
            <Pagination
              page={t.state.page}
              totalPages={totalPages}
              onPageChange={t.setPage}
              total={total}
              pageSize={t.state.pageSize}
              onPageSizeChange={t.setPageSize}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
