'use client';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { AdminBooking, BookingStatus } from '@/types/booking';
import { formatDate, formatAmount } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const statusVariant: Record<BookingStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  interest_expressed: 'info',
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'danger',
  completed: 'default',
  refunded: 'default',
  disputed: 'warning',
};

const statusLabel: Record<BookingStatus, string> = {
  interest_expressed: 'Intérêt exprimé',
  confirmed: 'Confirmée',
  pending: 'En attente',
  cancelled: 'Annulée',
  completed: 'Terminée',
  refunded: 'Remboursée',
  disputed: 'Litige',
};

interface Props { data: AdminBooking[]; loading?: boolean }

export function BookingsTable({ data, loading }: Props) {
  const router = useRouter();
  const columns = [
    { key: 'propertyTitle', header: 'Propriété' },
    { key: 'clientName', header: 'Client' },
    { key: 'checkIn', header: 'Arrivée', render: (b: AdminBooking) => b.status === 'interest_expressed' ? '—' : formatDate(b.checkIn) },
    { key: 'totalAmount', header: 'Montant', render: (b: AdminBooking) => b.status === 'interest_expressed' ? 'Sans paiement' : formatAmount(b.totalAmount) },
    { key: 'status', header: 'Statut', render: (b: AdminBooking) => <Badge variant={statusVariant[b.status]}>{statusLabel[b.status] ?? b.status}</Badge> },
  ];
  return <Table columns={columns} data={data} keyExtractor={(b: AdminBooking) => b.id} loading={loading} onRowClick={(b: AdminBooking) => router.push(`/bookings/${b.id}`)} />;
}
