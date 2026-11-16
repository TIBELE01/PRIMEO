'use client';
// Versements — demandes de versement des professionnels. Le portefeuille Primeo est virtuel :
// l'administrateur effectue le virement (Mobile Money / banque) puis marque la demande comme versée.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { withdrawalsService } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatAmount, formatDateTime } from '@/lib/utils';

type Withdrawal = {
  id: string; amount: number; status: 'pending' | 'paid' | 'rejected' | 'cancelled';
  method: string; holderName: string; accountNumber: string; bankName?: string | null;
  reference?: string | null; rejectionReason?: string | null; createdAt: string; processedAt?: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string | null };
};

const METHOD: Record<string, string> = {
  orange_money: 'Orange Money', mtn_money: 'MTN Money', wave: 'Wave', moov_money: 'Moov Money', bank: 'Banque',
};
const STATUS: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'default' }> = {
  pending: { label: 'À verser', variant: 'warning' }, paid: { label: 'Versé', variant: 'success' },
  rejected: { label: 'Refusé', variant: 'danger' }, cancelled: { label: 'Annulé', variant: 'default' },
};
const FILTERS = [['pending', 'À verser'], ['paid', 'Versés'], ['rejected', 'Refusés'], ['', 'Toutes']] as const;

export default function WithdrawalsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<string>('pending');
  const { data, isLoading } = useQuery<Withdrawal[]>({
    queryKey: ['withdrawals', status],
    queryFn: () => withdrawalsService.list(status || undefined) as Promise<Withdrawal[]>,
  });

  const done = (msg: string) => { toast.success(msg); qc.invalidateQueries({ queryKey: ['withdrawals'] }); };
  const paid = useMutation({
    mutationFn: ({ id, reference }: { id: string; reference?: string }) => withdrawalsService.markPaid(id, reference),
    onSuccess: () => done('Demande marquée comme versée'),
    onError: () => toast.error('Impossible de marquer cette demande comme versée'),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => withdrawalsService.reject(id, reason),
    onSuccess: () => done('Demande refusée — le solde a été recrédité'),
    onError: () => toast.error('Impossible de refuser cette demande'),
  });

  const onPaid = (w: Withdrawal) => {
    const reference = window.prompt(`Virement de ${formatAmount(w.amount)} effectué ? Saisissez la référence du virement (facultatif) :`, '');
    if (reference === null) return;
    paid.mutate({ id: w.id, reference: reference || undefined });
  };
  const onReject = (w: Withdrawal) => {
    const reason = window.prompt('Motif du refus (affiché au professionnel) :', '');
    if (!reason?.trim()) return;
    reject.mutate({ id: w.id, reason: reason.trim() });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Versements aux professionnels</h1>
        <p className="mt-1 text-sm text-gray-500">
          Le portefeuille Primeo est virtuel. Effectuez le virement sur les coordonnées indiquées, puis marquez la demande comme versée.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button key={label} onClick={() => setStatus(value)}
            className={`rounded-full border px-3 py-1 text-sm ${status === value ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? <PageSpinner /> : !data?.length ? (
        <Card><p className="py-8 text-center text-sm text-gray-500">Aucune demande.</p></Card>
      ) : (
        <div className="grid gap-4">
          {data.map((w) => (
            <Card key={w.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-lg font-bold text-gray-900">{formatAmount(w.amount)}</p>
                  <p className="text-sm text-gray-700">{w.user.firstName} {w.user.lastName} · {w.user.email}{w.user.phone ? ` · ${w.user.phone}` : ''}</p>
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{METHOD[w.method] ?? w.method}</span>{w.bankName ? ` — ${w.bankName}` : ''} · {w.holderName} · <span className="font-mono">{w.accountNumber}</span>
                  </p>
                  <p className="text-xs text-gray-500">Demandé le {formatDateTime(w.createdAt)}{w.processedAt ? ` · traité le ${formatDateTime(w.processedAt)}` : ''}</p>
                  {w.reference && <p className="text-xs text-gray-500">Référence : {w.reference}</p>}
                  {w.rejectionReason && <p className="text-xs text-red-600">Motif : {w.rejectionReason}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={STATUS[w.status]?.variant ?? 'default'}>{STATUS[w.status]?.label ?? w.status}</Badge>
                  {w.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => onPaid(w)} disabled={paid.isPending}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                        Marquer comme versé
                      </button>
                      <button onClick={() => onReject(w)} disabled={reject.isPending}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                        Refuser
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
