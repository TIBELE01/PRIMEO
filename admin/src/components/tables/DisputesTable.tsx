'use client';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { AdminDispute, DisputeStatus } from '@/types/dispute';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const statusVariant: Record<DisputeStatus, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
  open: 'warning', under_review: 'info', resolved_client: 'success', resolved_professional: 'success', rejected: 'default',
};

interface Props { data: AdminDispute[]; loading?: boolean }

export function DisputesTable({ data, loading }: Props) {
  const router = useRouter();
  const columns = [
    { key: 'subject', header: 'Sujet' },
    { key: 'complainantName', header: 'Plaignant' },
    { key: 'status', header: 'Statut', render: (d: AdminDispute) => <Badge variant={statusVariant[d.status]}>{d.status}</Badge> },
    { key: 'createdAt', header: 'Ouvert le', render: (d: AdminDispute) => formatDate(d.createdAt) },
  ];
  return <Table columns={columns} data={data} keyExtractor={(d: AdminDispute) => d.id} loading={loading} onRowClick={(d: AdminDispute) => router.push(`/disputes/${d.id}`)} />;
}
