'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatAmount } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { RefundForm } from '@/components/forms/RefundForm';
import { useState } from 'react';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [showRefund, setShowRefund] = useState(false);

  const { data: booking, isLoading } = useQuery({ queryKey: ['booking', id], queryFn: () => bookingsService.getBookingById(id) });

  const cancel = useMutation({
    mutationFn: () => bookingsService.cancelBooking(id),
    onSuccess: () => { toast.success('Réservation annulée'); qc.invalidateQueries({ queryKey: ['booking', id] }); },
  });

  if (isLoading) return <PageSpinner />;
  if (!booking) return <p className="text-gray-500">Réservation introuvable</p>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}><ArrowLeft size={20} className="text-gray-400 hover:text-gray-700" /></button>
        <h1 className="text-2xl font-bold text-gray-900">Réservation #{id.slice(0, 8)}</h1>
        <Badge variant={booking.status === 'confirmed' ? 'success' : 'warning'}>{booking.status}</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Propriété</dt><dd>{booking.propertyTitle}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Client</dt><dd>{booking.clientName}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Arrivée</dt><dd>{formatDate(booking.checkIn)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Départ</dt><dd>{formatDate(booking.checkOut)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Montant total</dt><dd className="font-bold">{formatAmount(booking.totalAmount)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Commission</dt><dd>{formatAmount(booking.commissionAmount)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Option paiement</dt><dd>{booking.paymentOption}</dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="danger" size="sm" loading={cancel.isPending} onClick={() => cancel.mutate()} className="w-full">Annuler</Button>
              <Button variant="outline" size="sm" onClick={() => setShowRefund(!showRefund)} className="w-full">Rembourser</Button>
              {showRefund && <RefundForm bookingId={id} maxAmount={booking.totalAmount} onSuccess={() => setShowRefund(false)} />}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
