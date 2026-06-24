'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disputesService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate, formatDateTime, formatAmount } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, ExternalLink, Paperclip } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { DisputeMessage } from '@/types/dispute';

type ActionFlow = 'reject' | 'partial' | 'full' | null;

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  open: 'warning', under_review: 'info', resolved_client: 'success', resolved_professional: 'success', rejected: 'default',
};
const statusLabel: Record<string, string> = {
  open: 'Ouvert', under_review: 'En révision', resolved_client: 'Résolu (client)',
  resolved_professional: 'Résolu (pro)', rejected: 'Rejeté',
};
const resolutionLabel: Record<string, string> = {
  full_refund: 'Remboursement total', partial_refund: 'Remboursement partiel', no_refund: 'Aucun remboursement',
};

function ageDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [activeFlow, setActiveFlow] = useState<ActionFlow>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [partialAmount, setPartialAmount] = useState(0);
  const msgRef = useRef<HTMLDivElement>(null);

  const { data: dispute, isLoading } = useQuery<any>({
    queryKey: ['dispute', id],
    queryFn: () => disputesService.getDisputeById(id),
  });

  useEffect(() => {
    if (dispute?.requestedRefundAmount) setPartialAmount(dispute.requestedRefundAmount);
  }, [dispute?.requestedRefundAmount]);

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [dispute?.messages?.length]);

  const fullRefund = useMutation({
    mutationFn: () => disputesService.resolveDispute(id, 'full_refund'),
    onSuccess: () => {
      toast.success('Remboursement total validé — Genius Pay initié, les deux parties notifiées');
      qc.invalidateQueries({ queryKey: ['dispute', id] });
      qc.invalidateQueries({ queryKey: ['disputes'] });
      setActiveFlow(null);
    },
    onError: () => toast.error('Erreur lors du remboursement'),
  });

  const partialRefund = useMutation({
    mutationFn: () => disputesService.resolveDispute(id, 'partial_refund', String(partialAmount)),
    onSuccess: () => {
      toast.success(`Remboursement partiel de ${formatAmount(partialAmount)} initié via Genius Pay`);
      qc.invalidateQueries({ queryKey: ['dispute', id] });
      qc.invalidateQueries({ queryKey: ['disputes'] });
      setActiveFlow(null);
    },
    onError: () => toast.error('Erreur lors du remboursement partiel'),
  });

  const rejectDispute = useMutation({
    mutationFn: () => disputesService.reject(id, rejectReason),
    onSuccess: () => {
      toast.success('Litige rejeté — client notifié');
      qc.invalidateQueries({ queryKey: ['dispute', id] });
      qc.invalidateQueries({ queryKey: ['disputes'] });
      setActiveFlow(null);
      setRejectReason('');
    },
    onError: () => toast.error('Erreur lors du rejet'),
  });

  const sendMsg = useMutation({
    mutationFn: () => disputesService.sendMessage(id, message),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['dispute', id] });
    },
    onError: () => toast.error("Erreur lors de l'envoi"),
  });

  if (isLoading) return <PageSpinner />;
  if (!dispute) return <p className="text-gray-500 p-8">Litige introuvable</p>;

  const messages: DisputeMessage[] = dispute.messages ?? [];
  const isResolved = ['resolved_client', 'resolved_professional', 'rejected'].includes(dispute.status);
  const days = ageDays(dispute.createdAt);
  const maxRefund: number = dispute.requestedRefundAmount ?? 0;

  // Collect all attachments from all messages for the summary panel
  const allAttachments = messages.flatMap((m: DisputeMessage) =>
    (m.attachments ?? []).map(url => ({ url, authorName: m.authorName, authorRole: m.authorRole }))
  );

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{dispute.reason ?? 'Litige'}</h1>
            <Badge variant={statusVariant[dispute.status] ?? 'default'}>{statusLabel[dispute.status] ?? dispute.status}</Badge>
            {days >= 7 && <Badge variant="danger">{days}j — Critique</Badge>}
            {days >= 2 && days < 7 && <Badge variant="warning">{days}j — Élevée</Badge>}
          </div>
          {dispute.propertyTitle && (
            <p className="text-sm text-gray-500 mt-0.5">{dispute.propertyTitle}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Message thread — takes 2 cols */}
        <div className="md:col-span-2 space-y-4">
          <Card padding={false}>
            <CardHeader>
              <CardTitle>Messages ({messages.length})</CardTitle>
            </CardHeader>

            <div ref={msgRef} className="max-h-[480px] overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">Aucun message dans ce litige</p>
              )}
              {messages.map((m: DisputeMessage) => {
                const isClient = m.authorRole === 'client';
                const isPro = m.authorRole === 'professional';
                const isAdmin = m.authorRole === 'admin';
                return (
                  <div key={m.id} className={`flex ${isPro ? 'justify-end' : isAdmin ? 'justify-center' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-xl px-3.5 py-2.5 ${
                      isClient
                        ? 'bg-blue-50 border border-blue-100'
                        : isPro
                        ? 'bg-gray-100 border border-gray-200'
                        : 'bg-amber-50 border border-amber-200'
                    }`}>
                      <p className={`text-xs font-semibold mb-1 ${
                        isAdmin ? 'text-amber-700' : isClient ? 'text-blue-700' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {m.authorName}
                        <span className="font-normal ml-1">
                          · {isClient ? 'Client' : isPro ? 'Professionnel' : 'Administrateur'}
                        </span>
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{m.content}</p>
                      {(m.attachments ?? []).length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-black/5 pt-2">
                          {m.attachments!.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-primary-700 hover:underline"
                            >
                              <Paperclip size={11} />
                              Pièce jointe {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1.5">{formatDateTime(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isResolved && (
              <div className="border-t border-gray-100 p-4 flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
                      e.preventDefault();
                      sendMsg.mutate();
                    }
                  }}
                  placeholder="Votre message en tant qu'administrateur…"
                  className="input flex-1 text-sm"
                />
                <Button
                  size="sm"
                  leftIcon={<Send size={14} />}
                  onClick={() => sendMsg.mutate()}
                  loading={sendMsg.isPending}
                  disabled={!message.trim()}
                >
                  Envoyer
                </Button>
              </div>
            )}
          </Card>

          {/* Pièces jointes récapitulatif */}
          {allAttachments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Pièces jointes ({allAttachments.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-50">
                  {allAttachments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-xs font-medium text-gray-700">{a.authorName}</p>
                        <p className="text-xs text-gray-400 capitalize">{a.authorRole}</p>
                      </div>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary-700 hover:underline"
                      >
                        <ExternalLink size={12} /> Voir la pièce jointe
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar — info + actions */}
        <div className="space-y-4">
          {/* Info */}
          <Card>
            <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Client</dt>
                  <dd className="font-medium text-gray-900">{dispute.clientName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Professionnel</dt>
                  <dd className="font-medium text-gray-900">{dispute.professionalName}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500 dark:text-gray-400">Réservation</dt>
                  <dd>
                    {dispute.bookingId ? (
                      <button
                        onClick={() => router.push(`/bookings/${dispute.bookingId}`)}
                        className="font-mono text-xs text-primary-700 hover:underline"
                      >
                        {dispute.bookingId.slice(0, 8)}… →
                      </button>
                    ) : (
                      <span className="font-mono text-xs text-gray-400">—</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Ouvert le</dt>
                  <dd>{formatDate(dispute.createdAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Ancienneté</dt>
                  <dd className={days >= 7 ? 'text-red-600 font-semibold' : days >= 2 ? 'text-amber-600' : ''}>
                    {days} jour{days > 1 ? 's' : ''}
                  </dd>
                </div>
                {maxRefund > 0 && (
                  <div className="flex justify-between pt-2.5 border-t border-gray-100">
                    <dt className="text-gray-500 dark:text-gray-400">Remboursement demandé</dt>
                    <dd className="font-bold text-gray-900">{formatAmount(maxRefund)}</dd>
                  </div>
                )}
                {dispute.description && (
                  <div className="pt-2.5 border-t border-gray-100">
                    <dt className="text-gray-500 mb-1 text-xs uppercase tracking-wide">Description</dt>
                    <dd className="text-gray-700 text-xs leading-relaxed">{dispute.description}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Resolution recap if already resolved */}
          {isResolved && (dispute.resolvedAt || dispute.resolution) && (
            <Card>
              <CardHeader><CardTitle>Résolution</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Décision</dt>
                    <dd className="font-medium">{resolutionLabel[dispute.resolution] ?? dispute.resolution ?? '—'}</dd>
                  </div>
                  {dispute.resolvedAmount !== null && dispute.resolvedAmount !== undefined && dispute.resolvedAmount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Montant remboursé</dt>
                      <dd className="font-semibold text-green-700">{formatAmount(dispute.resolvedAmount)}</dd>
                    </div>
                  )}
                  {dispute.resolvedAt && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Résolu le</dt>
                      <dd>{formatDate(dispute.resolvedAt)}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Action panel */}
          {!isResolved && (
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent>
                {/* Flow selector */}
                {activeFlow === null && (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setActiveFlow('full')}
                      className="w-full"
                      disabled={maxRefund <= 0}
                    >
                      Remboursement total{maxRefund > 0 ? ` (${formatAmount(maxRefund)})` : ''}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveFlow('partial')}
                      className="w-full"
                      disabled={maxRefund <= 0}
                    >
                      Remboursement partiel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveFlow('reject')}
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Rejeter le litige
                    </Button>
                  </div>
                )}

                {/* Full refund confirmation */}
                {activeFlow === 'full' && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                      <p className="text-sm font-semibold text-green-800">Remboursement total</p>
                      <p className="text-sm text-green-700 mt-1">
                        {formatAmount(maxRefund)} seront versés au client via Genius Pay.
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Client et professionnel seront notifiés automatiquement.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setActiveFlow(null)} className="flex-1">
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={fullRefund.isPending}
                        onClick={() => fullRefund.mutate()}
                        className="flex-1"
                      >
                        Confirmer
                      </Button>
                    </div>
                  </div>
                )}

                {/* Partial refund */}
                {activeFlow === 'partial' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Montant à rembourser (max {formatAmount(maxRefund)})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={maxRefund}
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(Number(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Paiement traité via Genius Pay. Les deux parties seront notifiées.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setActiveFlow(null)} className="flex-1">
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={partialRefund.isPending}
                        onClick={() => partialRefund.mutate()}
                        disabled={partialAmount <= 0 || partialAmount > maxRefund}
                        className="flex-1"
                      >
                        Valider {partialAmount > 0 ? formatAmount(partialAmount) : ''}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Reject dispute */}
                {activeFlow === 'reject' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Motif du rejet *
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Expliquez pourquoi le litige est rejeté. Le client sera notifié par email."
                        className="input w-full h-24 resize-none text-sm"
                        maxLength={500}
                      />
                      <p className="text-xs text-gray-400 text-right mt-0.5">{rejectReason.length}/500</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setActiveFlow(null)} className="flex-1">
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={rejectDispute.isPending}
                        onClick={() => rejectDispute.mutate()}
                        disabled={!rejectReason.trim()}
                        className="flex-1"
                      >
                        Rejeter
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
