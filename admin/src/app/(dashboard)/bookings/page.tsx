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
import { AdminBooking } from '@/types/booking';
import { bookingStatusVariant as statusVariant, bookingStatusLabel as statusLabel, bookingStatusOptions } from '@/lib/bookingStatus';
import { listOf, pagesOf } from '@/lib/normalize';
import { useRouter } from 'next/navigation';

export default function BookingsPage() {
  const router = useRouter();
  const { queryParams, page, totalPages, handleSearch, handleFilter, handlePageChange, setTotalPages } = useDataTable();

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['bookings', queryParams],
    queryFn: () => bookingsService.getBookings(queryParams),
  });
  useEffect(() => {
    if (data) setTotalPages(pagesOf(data));
  }, [data, setTotalPages]);

  const bookings: AdminBooking[] = listOf(data);

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
        <Badge variant={statusVariant[b.status] ?? 'default'}>{statusLabel[b.status] ?? b.status}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
      <Card padding={false}>
        <div className="p-4 border-b border-gray-100 flex gap-3">
          <input type="search" placeholder="Rechercher…" onChange={(e) => handleSearch(e.target.value)} className="input flex-1" />
          <select onChange={(e) => handleFilter('status', e.target.value)} className="input w-56">
            <option value="">Tous</option>
            {bookingStatusOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
