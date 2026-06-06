'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { usersService } from '@/services/api';
import { useDataTable } from '@/hooks/useDataTable';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, initials, downloadCsv } from '@/lib/utils';
import { PlatformUser, UserStatus } from '@/types/user';
import { useRouter } from 'next/navigation';
import { Search, Download, Users } from 'lucide-react';

const statusVariant: Record<UserStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', pending_kyc: 'warning', pending_email: 'warning', banned: 'danger', suspended: 'danger',
};
const statusLabel: Record<UserStatus, string> = {
  active: 'Actif', pending_kyc: 'KYC en attente', pending_email: 'Email en attente', banned: 'Banni', suspended: 'Suspendu',
};

const roleLabel: Record<string, string> = {
  client: 'Client',
  professional_hebergement: 'Résidence Pro',
  professional_hotel: 'Hôtel Pro',
  professional_immobilier: 'Immobilier Pro',
  restaurateur: 'Restaurateur',
  admin: 'Admin',
};

const planLabel: Record<string, string> = {
  starter:    'Starter',
  business:   'Business',
  entreprise: 'Entreprise',
};

const planVariant: Record<string, 'default' | 'info' | 'success'> = {
  starter:    'default',
  business:   'info',
  entreprise: 'success',
};

const PERIODS = [
  { value: '', label: 'Toute période' },
  { value: '1d', label: "Aujourd'hui" },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: '90d', label: '90 derniers jours' },
];

const STATUS_TABS: { value: UserStatus | ''; label: string; color: string }[] = [
  { value: '',            label: 'Tous',         color: 'bg-gray-100 text-gray-700' },
  { value: 'active',      label: 'Actifs',        color: 'bg-green-100 text-green-700' },
  { value: 'pending_kyc', label: 'KYC en attente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'pending_email', label: 'Email en attente', color: 'bg-blue-100 text-blue-700' },
  { value: 'suspended',   label: 'Suspendus',     color: 'bg-orange-100 text-orange-700' },
  { value: 'banned',      label: 'Bannis',        color: 'bg-red-100 text-red-700' },
];

export default function UsersPage() {
  const router = useRouter();
  const { queryParams, page, totalPages, handleSearch, handleFilter, handlePageChange, setTotalPages } = useDataTable();
  const [activeStatus, setActiveStatus] = useState<UserStatus | ''>('');

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['users', queryParams],
    queryFn: () => usersService.getUsers(queryParams),
    retry: 1,
  });
  useEffect(() => {
    if (data?.pages) setTotalPages(data.pages);
    else if (data?.total && data?.limit) setTotalPages(Math.ceil(data.total / data.limit));
  }, [data, setTotalPages]);

  const users: PlatformUser[] = data?.users ?? data?.data ?? data?.items ?? [];

  const handleExport = () => {
    downloadCsv(
      users.map(u => ({
        id: u.id,
        prenom: u.firstName,
        nom: u.lastName,
        email: u.email,
        telephone: u.phone,
        role: u.role,
        formule: u.subscription?.planType ? (planLabel[u.subscription.planType.toLowerCase()] ?? u.subscription.planType) : '',
        statut: statusLabel[u.status] ?? u.status,
        kyc: u.kycVerified ? 'Vérifié' : 'En attente',
        inscription: formatDate(u.createdAt),
        derniere_connexion: u.lastLoginAt ? formatDate(u.lastLoginAt) : '',
      })),
      `utilisateurs_${new Date().toISOString().slice(0, 10)}`,
    );
  };

  const columns = [
    {
      key: 'avatar', header: '', render: (u: PlatformUser) => (
        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
          {initials(`${u.firstName} ${u.lastName}`)}
        </div>
      ),
    },
    {
      key: 'name', header: 'Utilisateur', render: (u: PlatformUser) => (
        <div>
          <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
          <p className="text-xs text-gray-500">{u.email}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Téléphone', render: (u: PlatformUser) => <span className="text-xs text-gray-600">{u.phone ?? '—'}</span> },
    { key: 'role', header: 'Rôle', render: (u: PlatformUser) => <Badge variant="info">{roleLabel[u.role] ?? u.role}</Badge> },
    { key: 'status', header: 'Statut', render: (u: PlatformUser) => <Badge variant={statusVariant[u.status]}>{statusLabel[u.status]}</Badge> },
    { key: 'kycVerified', header: 'KYC', render: (u: PlatformUser) => <Badge variant={u.kycVerified ? 'success' : 'warning'}>{u.kycVerified ? 'Vérifié' : 'En attente'}</Badge> },
    {
      key: 'subscription', header: 'Formule',
      render: (u: PlatformUser) => {
        const plan = u.subscription?.planType?.toLowerCase() ?? '';
        if (!plan) return <span className="text-xs text-gray-400">—</span>;
        return <Badge variant={planVariant[plan] ?? 'default'}>{planLabel[plan] ?? plan}</Badge>;
      },
    },
    { key: 'createdAt', header: 'Inscription', render: (u: PlatformUser) => <span className="text-xs">{formatDate(u.createdAt)}</span> },
  ];

  const total = data?.total ?? 0;

  const handleStatusTab = (value: UserStatus | '') => {
    setActiveStatus(value);
    handleFilter('status', value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          {total > 0 && <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString('fr-FR')} utilisateurs au total</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={!data?.users?.length}>
            Exporter CSV
          </Button>
          <Button size="sm" leftIcon={<Users size={14} />} onClick={() => router.push('/users/kyc')}>
            File KYC
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleStatusTab(tab.value as UserStatus | '')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
              activeStatus === tab.value
                ? `${tab.color} border-current shadow-sm`
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card padding={false}>
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Rechercher par nom ou email…"
              onChange={(e) => handleSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <select onChange={(e) => handleFilter('role', e.target.value)} className="input w-44">
            <option value="">Tous les rôles</option>
            {Object.entries(roleLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select onChange={(e) => handleFilter('period', e.target.value)} className="input w-44">
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {isLoading ? <PageSpinner /> : isError ? (
          <p className="text-center text-gray-400 py-10">Impossible de charger les utilisateurs.</p>
        ) : (
          <>
            <Table
              columns={columns}
              data={users}
              keyExtractor={(u: PlatformUser) => u.id}
              emptyMessage="Aucun utilisateur trouvé"
              onRowClick={(u: PlatformUser) => router.push(`/users/${u.id}`)}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </Card>
    </div>
  );
}
