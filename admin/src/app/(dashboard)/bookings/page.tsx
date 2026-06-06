'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { bookingsService } from '@/services/api';
import { useDataTable } from '@/hooks/useDataTable';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, Pagination } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatAmount } from '@/lib/utils';
import { AdminBooking, BookingStatus } from '@/types/booking';
import { useRouter } from 'next/navigation';

const statusVariant: Record<BookingStatus, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
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

export default function BookingsPage() {
  const router = useRouter();
  const { queryParams, page, totalPages, handleSearch, handleFilter, handlePageChange, setTotalPages } = useDataTable();

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['bookings', queryParams],
    queryFn: () => bookingsService.getBookings(queryParams),
  });
  useEffect(() => {
    if (data?.total && data?.pageSize) setTotalPages(Math.ceil(data.total / data.pageSize));
  }, [data, setTotalPages]);

  const bookings = data?.bookings ?? data?.data ?? data?.items ?? [];

  const columns = [
    { key: 'ref', header: 'Référence', render: (b: AdminBooking) => <span className="font-mono text-xs">{b.id.slice(0, 8)}</span> },
    { key: 'property', header: 'Propriété', render: (b: AdminBooking) => b.propertyTitle },
    { key: 'client', header: 'Client', render: (b: AdminBooking) => b.clientName },
    {
      key: 'dates',
      header: 'Dates',
      render: (b: AdminBooking) => b.status === 'interest_expressed'
        ? <span className="text-gray-400 text-xs">—</span>
        : `${formatDate(b.checkIn)} → ${formatDate(b.checkOut)}`,
    },
    {
      key: 'amount',
      header: 'Montant',
      render: (b: AdminBooking) => b.status === 'interest_expressed'
        ? <span className="text-gray-400 text-xs">Sans paiement</span>
        : formatAmount(b.totalAmount),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (b: AdminBooking) => (
        <Badge variant={statusVariant[b.status]}>{statusLabel[b.status] ?? b.status}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
      <Card padding={false}>
        <div className="p-4 border-b border-gray-100 flex gap-3">
          <input type="search" placeholder="Rechercher…" onChange={(e) => handleSearch(e.target.value)} className="input flex-1" />
          <select onChange={(e) => handleFilter('status', e.target.value)} className="input w-40">
            <option value="">Tous</option>
            <option value="interest_expressed">Intérêt exprimé</option>
            <option value="confirmed">Confirmée</option>
            <option value="pending">En attente</option>
            <option value="cancelled">Annulée</option>
            <option value="completed">Terminée</option>
          </select>
        </div>
        {isLoading ? <PageSpinner /> : isError ? (
          <p className="text-center text-gray-400 py-10">Impossible de charger les réservations.</p>
        ) : (
          <>
            <Table
              columns={columns}
              data={bookings}
              keyExtractor={(b: AdminBooking) => b.id}
              onRowClick={(b: AdminBooking) => router.push(`/bookings/${b.id}`)}
              emptyMessage="Aucune réservation trouvée"
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </Card>
    </div>
  );
}
