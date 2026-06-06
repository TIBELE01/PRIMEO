'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { bookingsService } from '@/services/api';
import { formatAmount } from '@/lib/utils';

interface Props { bookingId: string; maxAmount: number; onSuccess: () => void }

export function RefundForm({ bookingId, maxAmount, onSuccess }: Props) {
  const toast = useToast();
  const [amount, setAmount] = useState(maxAmount);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > maxAmount) return;
    setLoading(true);
    try {
      await bookingsService.refundBooking(bookingId, { amount, reason });
      toast.success(`Remboursement de ${formatAmount(amount)} initié`);
      onSuccess();
    } catch {
      toast.error('Erreur lors du remboursement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 mt-2 border-t border-gray-100 pt-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Montant (max {formatAmount(maxAmount)})</label>
        <input type="number" min={1} max={maxAmount} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input w-full" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Motif</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif du remboursement…" className="input w-full h-16 resize-none" required />
      </div>
      <Button type="submit" variant="danger" size="sm" loading={loading} className="w-full">Confirmer le remboursement</Button>
    </form>
  );
}
