'use client';
// Envois groupés push (OneSignal / Expo) et email (Brevo) aux utilisateurs Primeo,
// avec ciblage par groupe ou sélection, et historique des envois.
import { Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { broadcastService, usersService, type AdminBroadcast, type BroadcastAudience, type BroadcastChannel } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { Bell, Mail, Send, X, Search } from 'lucide-react';

const STATUS: Record<AdminBroadcast['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  processing: { label: 'En cours', variant: 'warning' },
  completed: { label: 'Terminé', variant: 'success' },
  partial: { label: 'Partiel', variant: 'warning' },
  failed: { label: 'Échec', variant: 'danger' },
};

const errorMessage = (e: unknown): string => {
  const err = e as { response?: { data?: { error?: string; details?: { fieldErrors?: Record<string, string[]> } } }; message?: string };
  const fe = err.response?.data?.details?.fieldErrors;
  const first = fe ? Object.values(fe).flat()[0] : undefined;
  return first ?? err.response?.data?.error ?? err.message ?? 'Erreur inattendue';
};

type Picked = { id: string; label: string };

function UserPicker({ picked, onChange }: { picked: Picked[]; onChange: (p: Picked[]) => void }) {
  const [q, setQ] = useState('');
  const { data, isFetching } = useQuery({
    queryKey: ['broadcast-user-search', q],
    queryFn: () => usersService.list({ search: q, limit: 8 }),
    enabled: q.trim().length >= 2,
  });
  const rows: Array<{ id: string; firstName?: string; lastName?: string; email?: string; accountType?: string }> =
    (data?.data ?? data?.users ?? []) as never;
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input !pl-8" data-testid="broadcast-user-search" placeholder="Rechercher un utilisateur (nom ou email)…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {q.trim().length >= 2 && (
        <div className="border border-gray-100 rounded-lg max-h-48 overflow-auto">
          {isFetching ? <p className="p-2 text-xs text-gray-400">Recherche…</p> : rows.filter((u) => u.accountType !== 'admin').length === 0 ? (
            <p className="p-2 text-xs text-gray-400">Aucun utilisateur trouvé</p>
          ) : rows.filter((u) => u.accountType !== 'admin').map((u) => {
            const label = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u.id;
            const already = picked.some((p) => p.id === u.id);
            return (
              <button key={u.id} type="button" disabled={already}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
                onClick={() => onChange([...picked, { id: u.id, label: `${label}${u.email ? ` · ${u.email}` : ''}` }])}>
                {label} <span className="text-xs text-gray-400">{u.email}</span>
              </button>
            );
          })}
        </div>
      )}
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="broadcast-picked">
          {picked.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 rounded-full px-2 py-0.5">
              {p.label}
              <button type="button" aria-label={`Retirer ${p.label}`} onClick={() => onChange(picked.filter((x) => x.id !== p.id))}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Compose({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState<BroadcastChannel[]>(['push']);
  const [audience, setAudience] = useState<BroadcastAudience>('clients');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<AdminBroadcast | null>(null);
  const { data: aud } = useQuery({ queryKey: ['broadcast-audiences'], queryFn: () => broadcastService.audiences() });

  const current = aud?.audiences.find((a) => a.audience === audience);
  const count = audience === 'selection' ? picked.length : current?.users ?? 0;
  const toggle = (c: BroadcastChannel) => setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const mutation = useMutation({
    mutationFn: () => broadcastService.send({
      title, message, channels, audience,
      recipientIds: audience === 'selection' ? picked.map((p) => p.id) : undefined,
      confirm: true,
    }),
    onSuccess: (b) => {
      setResult(b);
      setConfirm(false);
      toast.success(b.status === 'processing' ? 'Envoi lancé — suivez-le dans l’historique' : 'Envoi terminé');
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canSubmit = title.trim().length >= 3 && message.trim().length >= 5 && channels.length > 0 && count > 0 && confirm && !mutation.isPending;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <div className="space-y-4">
          <div>
            <label className="label">Canaux <span className="text-red-500">*</span></label>
            <div className="flex gap-2" role="group" aria-label="Canaux">
              {([['push', 'Notification push', Bell], ['email', 'Email', Mail]] as const).map(([c, label, Icon]) => (
                <button key={c} type="button" data-testid={`bc-channel-${c}`} aria-pressed={channels.includes(c)} onClick={() => toggle(c)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold border ${channels.includes(c) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="bc-audience">Destinataires <span className="text-red-500">*</span></label>
            <select id="bc-audience" className="input" data-testid="bc-audience" value={audience} onChange={(e) => setAudience(e.target.value as BroadcastAudience)}>
              {(aud?.audiences ?? []).map((a) => (
                <option key={a.audience} value={a.audience}>{a.label} ({a.users})</option>
              ))}
              <option value="selection">Sélection d’utilisateurs</option>
            </select>
            {audience !== 'selection' && current && (
              <p className="text-xs text-gray-400 mt-1">
                {current.users} compte(s) actif(s) · {current.withPush} avec un appareil enregistré pour le push.
                Les comptes suspendus ou bannis et les administrateurs sont exclus ; les préférences de chacun sont respectées.
              </p>
            )}
            {audience === 'selection' && <div className="mt-2"><UserPicker picked={picked} onChange={setPicked} /></div>}
          </div>

          <div>
            <label className="label" htmlFor="bc-title">Titre <span className="text-red-500">*</span></label>
            <input id="bc-title" className="input" data-testid="bc-title" maxLength={80} placeholder="ex. Nouveauté : réservez une table en 2 clics" value={title} onChange={(e) => setTitle(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Titre de la notification et objet de l’email · {title.length}/80</p>
          </div>

          <div>
            <label className="label" htmlFor="bc-message">Message <span className="text-red-500">*</span></label>
            <textarea id="bc-message" className="input" rows={6} data-testid="bc-message" maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message. Les sauts de ligne sont conservés dans l’email." />
            <p className="text-xs text-gray-400 mt-1">{message.length}/2000 · une notification push affiche environ 150 caractères</p>
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <input type="checkbox" data-testid="bc-confirm" className="mt-0.5" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
            <span><strong>Je confirme l’envoi à {count} destinataire(s).</strong> <span className="text-gray-500">L’envoi ne peut pas être annulé une fois lancé.</span></span>
          </label>

          <Button data-testid="bc-submit" loading={mutation.isPending} disabled={!canSubmit} onClick={() => mutation.mutate()} leftIcon={<Send size={14} />}>
            Envoyer
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Aperçu de la notification</h3>
          <div className="rounded-xl bg-gray-900 text-white p-3 text-sm" data-testid="bc-preview">
            <p className="text-[11px] text-gray-400 mb-1">PRIMEO · maintenant</p>
            <p className="font-semibold">{title || 'Titre de la notification'}</p>
            <p className="text-gray-200 line-clamp-3 whitespace-pre-wrap">{message || 'Votre message apparaîtra ici'}</p>
          </div>
        </Card>
        {result && (
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Résultat</h3>
              <Badge variant={STATUS[result.status].variant}>{STATUS[result.status].label}</Badge>
            </div>
            <BroadcastCounts b={result} />
          </Card>
        )}
      </div>
    </div>
  );
}

function BroadcastCounts({ b }: { b: AdminBroadcast }) {
  return (
    <div className="text-xs text-gray-600 space-y-0.5" data-testid="bc-counts">
      <p>{b.totalRecipients} destinataire(s)</p>
      {b.channels.includes('push') && <p>Push : {b.pushSent} envoyé(s){b.pushSkipped > 0 && <span className="text-gray-400"> · {b.pushSkipped} sans appareil ou push désactivé (notification visible dans l’app)</span>}</p>}
      {b.channels.includes('email') && <p>Email : {b.emailSent} envoyé(s){b.emailFailed > 0 && <span className="text-red-600"> · {b.emailFailed} échec(s)</span>}{b.emailSkipped > 0 && <span className="text-gray-400"> · {b.emailSkipped} désinscrit(s)</span>}</p>}
      {b.error && <p className="text-red-600">{b.error}</p>}
    </div>
  );
}

function BroadcastHistory() {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['broadcasts', page],
    queryFn: () => broadcastService.list(page),
    refetchInterval: (q) => ((q.state.data as { data: AdminBroadcast[] } | undefined)?.data.some((b) => b.status === 'processing') ? 4000 : false),
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <Card padding={false}>
      <div className="p-4 border-b border-gray-100"><h2 className="text-base font-semibold">Historique des envois push & email</h2></div>
      {isLoading ? <PageSpinner /> : !data || data.data.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">Aucun envoi pour le moment</div>
      ) : (
        <table className="w-full text-sm" data-testid="bc-history">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left p-3">Date</th><th className="text-left p-3">Canaux</th><th className="text-left p-3">Titre</th>
              <th className="text-left p-3">Groupe</th><th className="text-left p-3">Résultat</th><th className="text-left p-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((b) => (
              <Fragment key={b.id}>
                <tr className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => setOpenId(openId === b.id ? null : b.id)}>
                  <td className="p-3 whitespace-nowrap text-xs text-gray-500">{formatDateTime(b.createdAt)}</td>
                  <td className="p-3 whitespace-nowrap">{b.channels.map((c) => <Badge key={c}>{c === 'push' ? 'Push' : 'Email'}</Badge>)}</td>
                  <td className="p-3 max-w-xs truncate text-gray-700">{b.title}</td>
                  <td className="p-3 text-xs text-gray-600">{b.audienceLabel} ({b.totalRecipients})</td>
                  <td className="p-3 text-xs text-gray-600">
                    {b.channels.includes('push') && <span>{b.pushSent} push</span>}
                    {b.channels.length > 1 && ' · '}
                    {b.channels.includes('email') && <span>{b.emailSent} email{b.emailFailed > 0 && <span className="text-red-600"> ({b.emailFailed} échec)</span>}</span>}
                  </td>
                  <td className="p-3"><Badge variant={STATUS[b.status].variant}>{STATUS[b.status].label}</Badge></td>
                </tr>
                {openId === b.id && (
                  <tr className="bg-gray-50/60">
                    <td colSpan={6} className="p-4 space-y-2">
                      <p className="text-sm whitespace-pre-wrap text-gray-700">{b.message}</p>
                      <BroadcastCounts b={b} />
                      {b.createdByName && <p className="text-xs text-gray-400">Envoyé par {b.createdByName}{b.completedAt ? ` · terminé le ${formatDateTime(b.completedAt)}` : ''}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between p-3 border-t border-gray-100 text-sm">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
          <span className="text-gray-500">Page {page} / {pages}</span>
          <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
        </div>
      )}
    </Card>
  );
}

export function BroadcastPanel() {
  const qc = useQueryClient();
  return (
    <div className="space-y-4">
      <Compose onDone={() => qc.invalidateQueries({ queryKey: ['broadcasts'] })} />
      <BroadcastHistory />
    </div>
  );
}
