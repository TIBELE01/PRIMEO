'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatDateTime, formatAmount } from '@/lib/utils';
import { bookingStatusLabel, bookingStatusVariant, cancellableStatuses } from '@/lib/bookingStatus';
import { useToast } from '@/hooks/useToast';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

const paymentOptionLabel: Record<string, string> = {
  full_online: 'Paiement intégral en ligne',
  ten_percent_online: 'Acompte de 10 % en ligne',
  zero_online: 'Paiement sur place',
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');

  const { data: booking, isLoading, isError } = useQuery<any>({ queryKey: ['booking', id], queryFn: () => bookingsService.getBookingById(id) });

  const cancel = useMutation({
    mutationFn: () => bookingsService.cancelBooking(id, reason.trim()),
    onSuccess: () => {
      toast.success('Réservation annulée — le client est remboursé intégralement sur son portefeuille Primeo');
      setShowCancel(false);
      setReason('');
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Impossible d\'annuler cette réservation'),
  });

  if (isLoading) return <PageSpinner />;
  if (isError || !booking) return <p className="text-gray-500 dark:text-gray-400">Réservation introuvable</p>;

  const canCancel = cancellableStatuses.includes(booking.status);
  const row = (label: string, value: React.ReactNode, bold = false) => (
    <div className="flex justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">{label}</dt><dd className={bold ? 'font-bold text-right' : 'text-right'}>{value}</dd></div>
  );

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Retour"><ArrowLeft size={20} className="text-gray-400 hover:text-gray-700" /></button>
        <h1 className="text-2xl font-bold text-gray-900">Réservation #{id.slice(0, 8)}</h1>
        <Badge variant={bookingStatusVariant[booking.status] ?? 'default'}>{bookingStatusLabel[booking.status] ?? booking.status}</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {row('Propriété', booking.propertyTitle)}
              {row('Client', booking.clientName)}
              {booking.clientEmail && row('E-mail client', booking.clientEmail)}
              {booking.professionalName && row('Professionnel', booking.professionalName)}
              {row('Arrivée', formatDate(booking.checkIn))}
              {row('Départ', formatDate(booking.checkOut))}
              {row('Voyageurs', booking.guestCount ?? '—')}
              {row('Montant total', formatAmount(booking.totalAmount), true)}
              {row('Payé en ligne', formatAmount(booking.onlinePaidAmount))}
              {row('Reste à régler sur place', formatAmount(booking.remainingCashAmount))}
              {row('Option de paiement', paymentOptionLabel[booking.paymentOption] ?? booking.paymentOption)}
              {booking.createdAt && row('Créée le', formatDateTime(booking.createdAt))}
              {booking.cancellationReason && row('Motif d\'annulation', booking.cancellationReason)}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent>
            {canCancel ? (
              <div className="space-y-3">
                {!showCancel ? (
                  <Button variant="danger" size="sm" onClick={() => setShowCancel(true)} className="w-full">Annuler la réservation</Button>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); if (reason.trim().length >= 5) cancel.mutate(); }} className="space-y-3">
                    <p className="text-xs text-gray-500">L'annulation par l'administration rembourse intégralement le client sur son portefeuille Primeo.</p>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={500} required
                      placeholder="Motif de l'annulation (5 caractères minimum)…" className="input w-full h-20 resize-none" />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowCancel(false)} className="flex-1">Retour</Button>
                      <Button type="submit" variant="danger" size="sm" loading={cancel.isPending} disabled={reason.trim().length < 5} className="flex-1">Confirmer l'annulation</Button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucune action disponible pour une réservation « {bookingStatusLabel[booking.status] ?? booking.status} ».</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
