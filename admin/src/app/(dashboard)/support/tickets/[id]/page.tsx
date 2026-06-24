'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDateTime, formatRelative } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Lock, Eye, User, Paperclip } from 'lucide-react';
import { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Ouvert' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'resolved',    label: 'Résolu' },
  { value: 'closed',      label: 'Fermé' },
];

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technique', dispute: 'Litige', information: 'Information', complaint: 'Réclamation',
};
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente',
};
const priorityBadge: Record<string, 'danger' | 'warning' | 'default'> = {
  urgent: 'danger', high: 'danger', medium: 'warning', low: 'default',
};
const statusBadge: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  open: 'warning', in_progress: 'info', resolved: 'success', closed: 'default',
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const { data: ticket, isLoading } = useQuery<any>({
    queryKey: ['ticket', id],
    queryFn: () => supportService.getTicket(id),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['ticket', id] });

  const addComment = useMutation({
    mutationFn: () => supportService.addComment(id, content, isInternal),
    onSuccess: () => {
      setContent('');
      invalidate();
      toast.success(isInternal ? 'Note interne ajoutée' : 'Réponse envoyée');
    },
    onError: () => toast.error('Erreur lors de l\'envoi'),
  });

  const changeStatus = useMutation({
    mutationFn: (status: string) => supportService.changeStatus(id, status),
    onSuccess: () => { invalidate(); toast.success('Statut mis à jour'); },
    onError: () => toast.error('Erreur lors du changement de statut'),
  });

  const assignSelf = useMutation({
    mutationFn: (aId: string) => supportService.assignTicket(id, aId),
    onSuccess: () => { invalidate(); toast.success('Ticket assigné'); },
    onError: () => toast.error('Erreur lors de l\'assignation'),
  });

  if (isLoading) return <PageSpinner />;
  if (!ticket) return <p className="text-gray-500 p-6">Ticket introuvable</p>;

  const isClosed = ticket.status === 'closed';

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="mt-1 text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 truncate">{ticket.subject}</h1>
            <Badge variant={statusBadge[ticket.status] ?? 'default'}>
              {STATUS_OPTIONS.find((s) => s.value === ticket.status)?.label ?? ticket.status}
            </Badge>
            <Badge variant={priorityBadge[ticket.priority] ?? 'default'}>
              {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            #{id.slice(-8).toUpperCase()} · {CATEGORY_LABELS[ticket.category] ?? ticket.category} ·{' '}
            Créé {formatRelative(ticket.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: conversation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Description initiale</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              {ticket.attachments?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {ticket.attachments.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-primary-600 hover:underline">
                      <Paperclip size={13} /> Pièce jointe {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Échanges ({ticket.comments?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 mb-4">
                {(ticket.comments ?? []).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Aucun message</p>
                )}
                {(ticket.comments ?? []).map((c: any) => {
                  const isFromAdmin = c.authorId !== ticket.userId;
                  return (
                    <div
                      key={c.id}
                      className={`flex gap-2.5 ${isFromAdmin ? 'justify-end' : ''}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-xl px-4 py-2.5 text-sm ${
                          c.isInternal
                            ? 'bg-amber-50 border border-amber-200'
                            : isFromAdmin
                            ? 'bg-primary-700 text-white'
                            : 'bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-medium opacity-75">
                            {c.author?.firstName} {c.author?.lastName}
                          </span>
                          {c.isInternal && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-700">
                              <Lock size={10} /> Interne
                            </span>
                          )}
                        </div>
                        <p className="leading-relaxed">{c.content}</p>
                        <p className={`text-xs mt-1 ${isFromAdmin && !c.isInternal ? 'text-white/60' : 'text-gray-400'}`}>
                          {formatDateTime(c.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply box */}
              {!isClosed && (
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!isInternal}
                        onChange={() => setIsInternal(false)}
                        className="accent-primary-600"
                      />
                      <Eye size={13} className="text-gray-500 dark:text-gray-400" />
                      Visible par l'utilisateur
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={() => setIsInternal(true)}
                        className="accent-amber-500"
                      />
                      <Lock size={13} className="text-amber-500" />
                      Note interne
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={isInternal ? 'Note interne (non visible par l\'utilisateur)…' : 'Votre réponse…'}
                      rows={3}
                      className={`input flex-1 resize-none ${isInternal ? 'border-amber-300 bg-amber-50/30' : ''}`}
                    />
                    <Button
                      size="sm"
                      leftIcon={<Send size={14} />}
                      loading={addComment.isPending}
                      disabled={!content.trim()}
                      onClick={() => addComment.mutate()}
                      variant={isInternal ? 'outline' : 'primary'}
                      className="self-end"
                    >
                      {isInternal ? 'Ajouter note' : 'Envoyer'}
                    </Button>
                  </div>
                </div>
              )}
              {isClosed && (
                <p className="text-sm text-gray-400 text-center pt-3 border-t border-gray-100">
                  Ce ticket est fermé.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: info panel */}
        <div className="space-y-4">
          {/* Status change */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Changer le statut</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="input w-full mb-3"
                defaultValue={ticket.status}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <Button
                size="sm"
                className="w-full"
                loading={changeStatus.isPending}
                onClick={() => changeStatus.mutate(newStatus || ticket.status)}
              >
                Appliquer
              </Button>
            </CardContent>
          </Card>

          {/* Ticket user */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Utilisateur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User size={15} className="text-primary-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {ticket.user?.firstName} {ticket.user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{ticket.user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Assignation</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.assignee ? (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                    <User size={13} className="text-green-700" />
                  </div>
                  <p className="text-sm text-gray-700">
                    {ticket.assignee.firstName} {ticket.assignee.lastName}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-3 italic">Non assigné</p>
              )}
              <div className="flex gap-2">
                <input
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  placeholder="ID agent…"
                  className="input flex-1 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  loading={assignSelf.isPending}
                  disabled={!assigneeId.trim()}
                  onClick={() => assignSelf.mutate(assigneeId.trim())}
                >
                  Assigner
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Catégorie</dt>
                  <dd className="font-medium text-gray-900">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Priorité</dt>
                  <dd><Badge variant={priorityBadge[ticket.priority] ?? 'default'}>{PRIORITY_LABELS[ticket.priority] ?? ticket.priority}</Badge></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Créé le</dt>
                  <dd className="text-gray-700 dark:text-gray-300">{formatDateTime(ticket.createdAt)}</dd>
                </div>
                {ticket.resolvedAt && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Résolu le</dt>
                    <dd className="text-gray-700 dark:text-gray-300">{formatDateTime(ticket.resolvedAt)}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
