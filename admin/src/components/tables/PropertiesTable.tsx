'use client';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { AdminProperty, PropertyStatus } from '@/types/property';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const statusVariant: Record<PropertyStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', pending_review: 'warning', rejected: 'danger', draft: 'default', suspended: 'danger', archived: 'default',
};

interface Props { data: AdminProperty[]; loading?: boolean }

export function PropertiesTable({ data, loading }: Props) {
  const router = useRouter();
  const columns = [
    { key: 'title', header: 'Titre' },
    { key: 'ownerName', header: 'Propriétaire' },
    { key: 'sector', header: 'Secteur', render: (p: AdminProperty) => <Badge variant="info">{p.sector}</Badge> },
    { key: 'status', header: 'Statut', render: (p: AdminProperty) => <Badge variant={statusVariant[p.status]}>{p.status}</Badge> },
    { key: 'submittedAt', header: 'Soumis le', render: (p: AdminProperty) => formatDate(p.submittedAt) },
  ];
  return <Table columns={columns} data={data} keyExtractor={(p: AdminProperty) => p.id} loading={loading} onRowClick={(p: AdminProperty) => router.push(`/properties/${p.id}`)} />;
}
