'use client';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { PlatformUser, UserStatus } from '@/types/user';
import { formatDate, initials } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const statusVariant: Record<UserStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', pending_kyc: 'warning', pending_email: 'warning', banned: 'danger', suspended: 'danger',
};

interface Props { data: PlatformUser[]; loading?: boolean }

export function UsersTable({ data, loading }: Props) {
  const router = useRouter();
  const columns = [
    { key: 'avatar', header: '', render: (u: PlatformUser) => (
      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
        {initials(`${u.firstName} ${u.lastName}`)}
      </div>
    )},
    { key: 'name', header: 'Nom', render: (u: PlatformUser) => `${u.firstName} ${u.lastName}` },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Rôle' },
    { key: 'status', header: 'Statut', render: (u: PlatformUser) => <Badge variant={statusVariant[u.status]}>{u.status}</Badge> },
    { key: 'createdAt', header: 'Inscription', render: (u: PlatformUser) => formatDate(u.createdAt) },
  ];
  return <Table columns={columns} data={data} keyExtractor={(u: PlatformUser) => u.id} loading={loading} onRowClick={(u: PlatformUser) => router.push(`/users/${u.id}`)} />;
}
