'use client';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Download, ShieldCheck, ShieldX, Ban, PauseCircle, PlayCircle, UserCheck, User, Home, Hotel, Building2, UtensilsCrossed, UserCog } from 'lucide-react';
import { usersService } from '@/services/api';
import { useTableState } from '@/hooks/useTableState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination, Column } from '@/components/ui/Table';
import { HubCards, HubCrumbs, HubCard, hubDepth, stripAll } from '@/components/ui/Hub';
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

const NAV = ['role', 'status'];
const TYPE_META: Record<string, { icon: React.ReactNode; description: string }> = {
  client: { icon: <User size={20} />, description: 'Particuliers qui réservent' },
  professional_hebergement: { icon: <Home size={20} />, description: 'Résidences meublées' },
  professional_hotel: { icon: <Hotel size={20} />, description: 'Hôtels et établissements' },
  professional_immobilier: { icon: <Building2 size={20} />, description: 'Agents immobiliers' },
  restaurateur: { icon: <UtensilsCrossed size={20} />, description: 'Restaurants et menus' },
  admin: { icon: <UserCog size={20} />, description: 'Équipe d’administration' },
};

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
  const t = useTableState({ storageKey: 'users', restoreFromStorage: false, pushKeys: NAV });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const role0 = t.state.filters['role'] ?? '';
  const role = role0 === 'all' ? '' : role0;
  const status = t.state.filters['status'] ?? '';

  const depth = hubDepth(t.state.filters, NAV); // 0 : types · 1 : statuts · -1 : liste
  const params = stripAll(t.queryParams, NAV);
  if (depth !== -1) { params['limit'] = 1; params['page'] = 1; } // niveaux « cartes » : seuls les compteurs servent

  const { data, isLoading, isError, isFetching } = useQuery<any>({
    queryKey: ['users', params],
    queryFn: () => usersService.getUsers(params),
    enabled: t.hydrated,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const users: Row[] = data?.users ?? data?.data ?? data?.items ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.pages ?? Math.max(Math.ceil(total / t.state.pageSize), 1);
  const counts: Record<string, number> = data?.counts ?? {};
  const typeCounts: Record<string, number> = data?.typeCounts ?? {};

  const typeCards: HubCard[] = ACCOUNT_TYPES.map((a) => ({
    value: a.value, label: a.label, count: typeCounts[a.value] ?? 0, ...TYPE_META[a.value],
  }));
  const statusCards: HubCard[] = [
    ...USER_STATUS_ORDER.map((st) => ({ value: st, label: USER_STATUS[st]!.label, tone: USER_STATUS[st]!.tone, count: counts[st] ?? 0 })),
    { value: 'all', label: 'Tous les statuts', count: counts['all'] },
  ];
  const roleLabelOf = ACCOUNT_TYPES.find((a) => a.value === role)?.label ?? 'Tous les comptes';
  const statusLabelOf = status === 'all' ? 'Tous les statuts' : USER_STATUS[status]?.label ?? '';

  const selectedRows = users.filter((u) => selected.has(u.id));
  const refresh = () => { qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['kyc-pending'] }); };

  const choose = (key: 'role' | 'status', value: string) => { setSelected(new Set()); t.setFilter(key, value); };
  const backTo = (d: number) => {
    setSelected(new Set());
    t.setFilters({ ...(d <= 1 ? { status: '' } : {}), ...(d <= 0 ? { role: '' } : {}) });
    t.setSearch('');
  };

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

  const crumbs = [
    { label: 'Utilisateurs', onClick: depth === 0 ? undefined : () => backTo(0) },
    ...(role0 ? [{ label: roleLabelOf, onClick: depth === 1 ? undefined : () => backTo(1) }] : []),
    ...(status ? [{ label: statusLabelOf }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Utilisateurs</h1>
          <div className="mt-1"><HubCrumbs items={crumbs} /></div>
        </div>
        <div className="flex gap-2">
          {depth === -1 && <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={!users.length}>Exporter la vue (CSV)</Button>}
          <Button size="sm" leftIcon={<UserCheck size={14} />} onClick={() => router.push('/users/kyc')}>File KYC</Button>
        </div>
      </div>

      {depth === 0 && (
        <>
          <p className="text-sm text-gray-500">Choisissez un type de compte.</p>
          <HubCards cards={typeCards} loading={isLoading || !t.hydrated} onSelect={(v) => choose('role', v)} />
          <button type="button" onClick={() => { setSelected(new Set()); t.setFilters({ role: 'all', status: 'all' }); }} className="text-sm font-medium text-primary-700 hover:underline">
            Voir tous les comptes dans une seule liste
          </button>
        </>
      )}

      {depth === 1 && (
        <>
          <p className="text-sm text-gray-500">{roleLabelOf} — choisissez un statut.</p>
          <HubCards cards={statusCards} loading={isLoading || !t.hydrated} onSelect={(v) => choose('status', v)} />
        </>
      )}

      {depth === -1 && (
        <Card padding={false}>
          <FilterBar
            search={t.state.search}
            onSearch={t.setSearch}
            placeholder="Nom, email, téléphone…"
            activeCount={Object.entries(t.state.filters).filter(([k, v]) => !NAV.includes(k) && v).length + (t.state.search ? 1 : 0)}
            onReset={() => { setSelected(new Set()); t.reset(NAV); }}
          >
            {role !== 'client' && role !== 'admin' && (
              <input type="search" value={t.state.filters['city'] ?? ''} onChange={(e) => t.setFilter('city', e.target.value)} placeholder="Ville…" className="input w-36" aria-label="Filtrer par ville" />
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
              <Pagination page={t.state.page} totalPages={totalPages} onPageChange={t.setPage} total={total} pageSize={t.state.pageSize} onPageSizeChange={t.setPageSize} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
