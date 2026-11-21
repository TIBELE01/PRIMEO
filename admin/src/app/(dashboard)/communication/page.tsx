'use client';
// Communication — envois et diffusions WhatsApp / Telegram (via Norasend).
// Onglets : Push & email (envoi groupé + historique) · WhatsApp / Telegram (envoi, diffusion, historique) · Désinscriptions.
import { Fragment, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationService, type Campaign, type CampaignPayload, type MessagingChannel } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { Send, Megaphone, History, BanIcon, AlertTriangle, Trash2, Bell } from 'lucide-react';
import { BroadcastPanel } from './BroadcastPanel';

type Tab = 'notify' | 'send' | 'broadcast' | 'history' | 'optouts';
const TABS: Array<{ id: Tab; label: string; icon: typeof Send }> = [
  { id: 'notify', label: 'Push & email', icon: Bell },
  { id: 'send', label: 'WhatsApp / Telegram', icon: Send },
  { id: 'broadcast', label: 'Diffusion WhatsApp / Telegram', icon: Megaphone },
  { id: 'history', label: 'Historique WhatsApp / Telegram', icon: History },
  { id: 'optouts', label: 'Désinscriptions', icon: BanIcon },
];

const CHANNEL_LABEL: Record<MessagingChannel, string> = { whatsapp: 'WhatsApp', telegram: 'Telegram' };
const STATUS: Record<Campaign['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  processing: { label: 'En cours', variant: 'warning' },
  completed: { label: 'Accepté', variant: 'success' },
  partial: { label: 'Partiel', variant: 'warning' },
  failed: { label: 'Échec', variant: 'danger' },
};
const RECIPIENT_STATUS: Record<string, string> = { pending: 'En attente', sent: 'Accepté', failed: 'Échec', skipped: 'Ignoré' };

const errorMessage = (e: unknown): string => {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err.response?.data?.error ?? err.message ?? 'Erreur inattendue';
};

// Une ligne par destinataire : « numéro ; prénom ; nom » (prénom et nom facultatifs)
function parseRecipients(raw: string): Array<{ to: string; variables?: Record<string, string> }> {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [to, prenom, nom] = line.split(/[;\t]/).map((p) => p.trim());
      const variables: Record<string, string> = {};
      if (prenom) variables.prenom = prenom;
      if (nom) variables.nom = nom;
      return { to, ...(Object.keys(variables).length > 0 ? { variables } : {}) };
    });
}

// ── Formulaire d'envoi / de diffusion ─────────────────────────────────────────

function ComposeForm({ mode, onDone }: { mode: 'direct' | 'broadcast'; onDone: () => void }) {
  const toast = useToast();
  const [channel, setChannel] = useState<MessagingChannel>('whatsapp');
  const [recipientsRaw, setRecipientsRaw] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [parseMode, setParseMode] = useState<'' | 'HTML' | 'Markdown' | 'MarkdownV2'>('');
  const [defaultPrenom, setDefaultPrenom] = useState('');
  const [delaySec, setDelaySec] = useState<number | ''>('');
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<Campaign | null>(null);

  const recipients = parseRecipients(recipientsRaw);
  const isBroadcast = mode === 'broadcast';
  const first = recipients[0];
  const preview = text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, name: string) => first?.variables?.[name] ?? (name === 'prenom' ? defaultPrenom : '') ?? `{{${name}}}`);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CampaignPayload = {
        channel,
        recipients,
        text,
        title: title.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
        parseMode: channel === 'telegram' && parseMode ? parseMode : undefined,
        variables: isBroadcast && defaultPrenom.trim() ? { prenom: defaultPrenom.trim() } : undefined,
        delayMs: delaySec === '' ? undefined : Math.round(Number(delaySec) * 1000),
        consentConfirmed: consent,
      };
      return isBroadcast ? communicationService.broadcast(payload) : communicationService.send(payload);
    },
    onSuccess: (campaign) => {
      setResult(campaign);
      toast.success(campaign.status === 'processing' ? 'Envoi en cours — suivez-le dans l\'historique' : 'Envoi terminé');
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canSubmit = recipients.length > 0 && text.trim().length > 0 && consent && !mutation.isPending;
  const placeholder = channel === 'whatsapp' ? '2250700000001;Awa;Koné\n0700000002;Koffi' : '@mon_canal\n123456789;Awa';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <div className="space-y-4">
          <div className="flex gap-2" role="group" aria-label="Canal">
            {(['whatsapp', 'telegram'] as const).map((c) => (
              <button key={c} type="button" data-testid={`channel-${c}`} onClick={() => setChannel(c)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold border ${channel === c ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                {CHANNEL_LABEL[c]}
              </button>
            ))}
          </div>

          {isBroadcast && (
            <div>
              <label className="label">Titre (interne)</label>
              <input className="input" placeholder="ex. Promo de novembre" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
          )}

          <div>
            <label className="label">
              Destinataires <span className="text-red-500">*</span>
              <span className="ml-2 font-normal text-gray-400">{recipients.length} saisi(s)</span>
            </label>
            <textarea className="input font-mono text-xs" rows={5} data-testid="recipients" value={recipientsRaw} onChange={(e) => setRecipientsRaw(e.target.value)} placeholder={placeholder} />
            <p className="text-xs text-gray-400 mt-1">
              Un destinataire par ligne : {channel === 'whatsapp' ? 'numéro (format international ou local 07…)' : 'identifiant numérique ou @canal'}
              {isBroadcast && ' ; puis prénom ; nom (facultatifs) pour personnaliser avec {{prenom}} et {{nom}}'}.
            </p>
          </div>

          <div>
            <label className="label">Message <span className="text-red-500">*</span></label>
            <textarea className="input" rows={5} data-testid="message-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000}
              placeholder={isBroadcast ? 'Bonjour {{prenom}}, profitez de -20 % ce week-end sur Primeo !' : 'Votre message…'} />
            <div className="flex items-center justify-between mt-1">
              {isBroadcast ? (
                <div className="flex gap-1.5">
                  {['{{prenom}}', '{{nom}}'].map((v) => (
                    <button key={v} type="button" className="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-mono" onClick={() => setText((t) => `${t}${v}`)}>{v}</button>
                  ))}
                </div>
              ) : <span />}
              <span className="text-xs text-gray-400">{text.length}/4000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Média (URL https, facultatif)</label>
              <input className="input" placeholder="https://…/affiche.png" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
            </div>
            {channel === 'telegram' && (
              <div>
                <label className="label">Mise en forme</label>
                <select className="input" value={parseMode} onChange={(e) => setParseMode(e.target.value as typeof parseMode)}>
                  <option value="">Texte simple</option>
                  <option value="HTML">HTML</option>
                  <option value="Markdown">Markdown</option>
                  <option value="MarkdownV2">MarkdownV2</option>
                </select>
              </div>
            )}
            {isBroadcast && (
              <>
                <div>
                  <label className="label">Valeur par défaut de {'{{prenom}}'}</label>
                  <input className="input" placeholder="ex. cher client" value={defaultPrenom} onChange={(e) => setDefaultPrenom(e.target.value)} />
                </div>
                <div>
                  <label className="label">Pause entre deux envois (secondes, {channel === 'whatsapp' ? '3 à 30' : '0,5 à 10'})</label>
                  <input className="input" type="number" step="0.5" min={channel === 'whatsapp' ? 3 : 0.5} max={channel === 'whatsapp' ? 30 : 10} placeholder={channel === 'whatsapp' ? '4' : '1'} value={delaySec} onChange={(e) => setDelaySec(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <input type="checkbox" data-testid="consent" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              <strong>Je confirme que ces destinataires ont accepté de recevoir ces messages.</strong>{' '}
              <span className="text-gray-500">
                Les envois non sollicités sont contraires à la loi n°2013-450 et aux règles de WhatsApp et Telegram (risque de bannissement du numéro).
                Les destinataires désinscrits sont exclus automatiquement.
              </span>
            </span>
          </label>

          <Button data-testid="submit-campaign" loading={mutation.isPending} disabled={!canSubmit} onClick={() => mutation.mutate()} leftIcon={isBroadcast ? <Megaphone size={14} /> : <Send size={14} />}>
            {isBroadcast ? 'Lancer la diffusion' : 'Envoyer'}
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Aperçu{first ? ` — ${first.to}` : ''}</h3>
          <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-sm text-gray-800 whitespace-pre-wrap min-h-[64px]" data-testid="preview">
            {preview || <span className="text-gray-400">Le message apparaîtra ici</span>}
          </div>
        </Card>
        {result && (
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Résultat</h3>
              <Badge variant={STATUS[result.status].variant}>{STATUS[result.status].label}</Badge>
            </div>
            <p className="text-sm text-gray-600" data-testid="result-summary">
              {result.sentCount} accepté(s) par Norasend · {result.failedCount} en échec · {result.skippedCount} ignoré(s) sur {result.totalRecipients}
            </p>
            {(result.recipients ?? []).filter((r) => r.error).slice(0, 5).map((r) => (
              <p key={r.id} className="text-xs text-red-600 mt-1">{r.recipient} : {r.error}</p>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Historique ────────────────────────────────────────────────────────────────

function History_() {
  const [channel, setChannel] = useState<MessagingChannel | ''>('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', channel, page],
    queryFn: () => communicationService.campaigns({ page, channel }),
    // Tant qu'une campagne est en cours, l'historique se met à jour tout seul
    refetchInterval: (q) => ((q.state.data as { data: Campaign[] } | undefined)?.data.some((c) => c.status === 'processing') ? 4000 : false),
  });
  const detail = useQuery({ queryKey: ['campaign', openId], queryFn: () => communicationService.campaign(openId as string), enabled: !!openId });

  return (
    <Card padding={false}>
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-base font-semibold">Historique des envois</h2>
        <select className="input !w-auto" value={channel} onChange={(e) => { setChannel(e.target.value as MessagingChannel | ''); setPage(1); }} aria-label="Filtrer par canal">
          <option value="">Tous les canaux</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="telegram">Telegram</option>
        </select>
      </div>
      {isLoading ? <PageSpinner /> : !data || data.data.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">Aucun envoi pour le moment</div>
      ) : (
        <table className="w-full text-sm" data-testid="history-table">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left p-3">Date</th><th className="text-left p-3">Canal</th><th className="text-left p-3">Message</th>
              <th className="text-left p-3">Destinataires</th><th className="text-left p-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((c) => (
              <Fragment key={c.id}>
                <tr className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => setOpenId(openId === c.id ? null : c.id)}>
                  <td className="p-3 whitespace-nowrap text-xs text-gray-500">{formatDateTime(c.createdAt)}</td>
                  <td className="p-3"><Badge>{CHANNEL_LABEL[c.channel]}</Badge> <span className="text-xs text-gray-400">{c.mode === 'broadcast' ? 'diffusion' : 'direct'}</span></td>
                  <td className="p-3 max-w-xs truncate text-gray-700">{c.title ? <strong>{c.title} — </strong> : null}{c.text}</td>
                  <td className="p-3 text-xs text-gray-600">{c.sentCount}/{c.totalRecipients} accepté(s){c.failedCount > 0 && <span className="text-red-600"> · {c.failedCount} échec(s)</span>}{c.skippedCount > 0 && <span className="text-gray-400"> · {c.skippedCount} ignoré(s)</span>}</td>
                  <td className="p-3"><Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge></td>
                </tr>
                {openId === c.id && (
                  <tr className="bg-gray-50/60">
                    <td colSpan={5} className="p-4">
                      {detail.isLoading ? 'Chargement…' : (
                        <div className="space-y-1 max-h-60 overflow-auto">
                          {c.error && <p className="text-xs text-red-600">{c.error}</p>}
                          {(detail.data?.recipients ?? []).map((r) => (
                            <div key={r.id} className="flex gap-3 text-xs">
                              <span className="font-mono w-40 truncate">{r.recipient}</span>
                              <span className={r.status === 'sent' ? 'text-green-600' : r.status === 'failed' ? 'text-red-600' : 'text-gray-400'}>{RECIPIENT_STATUS[r.status]}</span>
                              {r.error && <span className="text-gray-500">{r.error}</span>}
                              {r.sentAt && <span className="text-gray-400">{formatDateTime(r.sentAt)}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between p-3 border-t border-gray-100 text-sm">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
          <span className="text-gray-500">Page {page} / {data.pages}</span>
          <Button size="sm" variant="ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
        </div>
      )}
    </Card>
  );
}

// ── Désinscriptions ───────────────────────────────────────────────────────────

function OptOuts() {
  const toast = useToast();
  const qc = useQueryClient();
  const [channel, setChannel] = useState<MessagingChannel>('whatsapp');
  const [recipient, setRecipient] = useState('');
  const [reason, setReason] = useState('');
  const { data = [], isLoading } = useQuery({ queryKey: ['opt-outs'], queryFn: () => communicationService.optOuts() });

  const add = useMutation({
    mutationFn: () => communicationService.addOptOut(channel, recipient, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['opt-outs'] }); setRecipient(''); setReason(''); toast.success('Désinscription enregistrée'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => communicationService.removeOptOut(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['opt-outs'] }); toast.success('Désinscription retirée'); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-gray-500 mb-3">Les contacts listés ici ne reçoivent plus aucun message sur le canal concerné, quelle que soit la campagne.</p>
        <div className="flex flex-wrap gap-2 items-end">
          <select className="input !w-auto" value={channel} onChange={(e) => setChannel(e.target.value as MessagingChannel)}>
            <option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option>
          </select>
          <input className="input !w-56" placeholder={channel === 'whatsapp' ? '2250700000001' : '@canal ou 123456789'} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <input className="input !w-64" placeholder="Motif (facultatif)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" loading={add.isPending} disabled={!recipient.trim()} onClick={() => add.mutate()}>Désinscrire</Button>
        </div>
      </Card>
      <Card padding={false}>
        {isLoading ? <PageSpinner /> : data.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">Aucune désinscription</div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide"><th className="text-left p-3">Canal</th><th className="text-left p-3">Contact</th><th className="text-left p-3">Motif</th><th className="text-left p-3">Date</th><th /></tr></thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-b border-gray-50">
                  <td className="p-3"><Badge>{CHANNEL_LABEL[o.channel]}</Badge></td>
                  <td className="p-3 font-mono text-xs">{o.recipient}</td>
                  <td className="p-3 text-gray-500">{o.reason ?? '—'}</td>
                  <td className="p-3 text-xs text-gray-400">{formatDateTime(o.createdAt)}</td>
                  <td className="p-3 text-right"><button aria-label="Retirer" className="text-gray-400 hover:text-red-600" onClick={() => remove.mutate(o.id)}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommunicationPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('notify');
  const { data: status } = useQuery({ queryKey: ['messaging-status'], queryFn: () => communicationService.status() });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Communication</h1>
        <p className="text-xs text-gray-400 mt-0.5">Notifications push et emails aux utilisateurs Primeo · messages WhatsApp Business et Telegram via Norasend</p>
      </div>

      {tab !== 'notify' && status && !status.configured && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800" data-testid="not-configured">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Norasend n&apos;est pas configuré : ajoutez <code>NORASEND_API_KEY</code> sur le serveur. Les envois sont désactivés.</span>
        </div>
      )}
      {tab !== 'notify' && status?.configured && (['whatsapp', 'telegram'] as const).map((ch) => !status[ch].ready && (
        <div key={ch} className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800" data-testid={`channel-down-${ch}`}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span><strong>{ch === 'whatsapp' ? 'WhatsApp' : 'Telegram'}</strong> indisponible : {status[ch].error ?? 'canal non connecté'}.
            {ch === 'telegram' && ' Un bot Telegram ne peut écrire qu\'aux personnes qui lui ont écrit en premier, ou aux canaux dont il est administrateur.'}</span>
        </div>
      ))}

      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} data-testid={`tab-${id}`} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'notify' && <BroadcastPanel />}
      {tab === 'send' && <ComposeForm mode="direct" onDone={() => qc.invalidateQueries({ queryKey: ['campaigns'] })} />}
      {tab === 'broadcast' && <ComposeForm mode="broadcast" onDone={() => qc.invalidateQueries({ queryKey: ['campaigns'] })} />}
      {tab === 'history' && <History_ />}
      {tab === 'optouts' && <OptOuts />}
    </div>
  );
}
