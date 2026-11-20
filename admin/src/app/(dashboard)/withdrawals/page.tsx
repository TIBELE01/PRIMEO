'use client';
// Retraits et versements — demandes des professionnels ET des clients (gains de parrainage).
// Le portefeuille Primeo est virtuel : l'administrateur effectue le dépôt (Mobile Money / banque)
// puis clique sur la demande et valide le versement. Le montant a été réservé sur le portefeuille
// dès la demande ; il est recrédité en cas de refus.
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { withdrawalsService } from '@/services/api';
import { useTableState } from '@/hooks/useTableState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination, Column } from '@/components/ui/Table';
import { HubCards, HubCrumbs, HubCard, hubDepth, stripAll } from '@/components/ui/Hub';
import { FilterBar } from '@/components/ui/FilterBar';
import { BulkActionBar, BulkAction } from '@/components/ui/BulkActions';
import { formatAmount, formatDateTime, downloadCsv } from '@/lib/utils';
import { toneAccent } from '@/lib/status';

type Withdrawal = {
  id: string; amount: number; status: 'pending' | 'paid' | 'rejected' | 'cancelled';
  method: string; holderName: string; accountNumber: string; bankName?: string | null;
  reference?: string | null; rejectionReason?: string | null; createdAt: string; processedAt?: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string | null; accountType?: string };
};

const METHOD: Record<string, string> = { orange_money: 'Orange Money', mtn_money: 'MTN Money', wave: 'Wave', moov_money: 'Moov Money', bank: 'Banque' };
const STATUS: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' | 'default' }> = {
  pending: { label: 'À verser', tone: 'warning' }, paid: { label: 'Versé', tone: 'success' },
  rejected: { label: 'Refusé', tone: 'danger' }, cancelled: { label: 'Annulé', tone: 'default' },
};

const NAV = ['status'];
const isClient = (w: Withdrawal) => w.user.accountType === 'client';
const typeLabel = (w: Withdrawal) => (isClient(w) ? 'Client' : 'Professionnel');

export default function WithdrawalsPage() {
  const qc = useQueryClient();
  const t = useTableState({ storageKey: 'withdrawals', restoreFromStorage: false, pushKeys: NAV });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toast = useToast();
  const [detail, setDetail] = useState<Withdrawal | null>(null);
  const [reference, setReference] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const openDetail = (w: Withdrawal) => { setDetail(w); setReference(''); setRejectReason(''); setRejecting(false); };
  const refresh = () => qc.invalidateQueries({ queryKey: ['withdrawals'] });
  const confirmPaid = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await withdrawalsService.markPaid(detail.id, reference.trim() || undefined);
      toast.success('Versement validé — le bénéficiaire est notifié');
      setDetail(null); await refresh();
    } catch (e) { toast.error((e as Error).message || 'Validation impossible'); } finally { setBusy(false); }
  };
  const confirmReject = async () => {
    if (!detail || !rejectReason.trim()) return;
    setBusy(true);
    try {
      await withdrawalsService.reject(detail.id, rejectReason.trim());
      toast.success('Demande refusée — le montant est recrédité');
      setDetail(null); await refresh();
    } catch (e) { toast.error((e as Error).message || 'Refus impossible'); } finally { setBusy(false); }
  };
  const f = t.state.filters;
  const status = f['status'] ?? '';
  const depth = hubDepth(f, NAV);

  // L'API renvoie jusqu'à 200 demandes : filtrage, tri et pagination se font ici
  const { data, isLoading, isError } = useQuery<Withdrawal[]>({
    queryKey: ['withdrawals'],
    queryFn: () => withdrawalsService.list() as Promise<Withdrawal[]>,
  });
  const all = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    all.forEach((w) => { c[w.status] = (c[w.status] ?? 0) + 1; });
    return c;
  }, [all]);

  const filtered = useMemo(() => {
    const q = t.state.search.trim().toLowerCase();
    const from = f['from'] ? new Date(f['from']).getTime() : null;
    const to = f['to'] ? new Date(`${f['to']}T23:59:59`).getTime() : null;
    const rows = all.filter((w) => {
      if (status !== 'all' && w.status !== status) return false;
      if (f['method'] && w.method !== f['method']) return false;
      if (f['type'] === 'client' && !isClient(w)) return false;
      if (f['type'] === 'pro' && isClient(w)) return false;
      const ts = new Date(w.createdAt).getTime();
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      if (q) {
        const hay = `${w.user.firstName} ${w.user.lastName} ${w.user.email} ${w.holderName} ${w.accountNumber} ${w.reference ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const dir = t.state.sortDir === 'asc' ? 1 : -1;
    const val = (w: Withdrawal): number | string => t.state.sortKey === 'amount' ? w.amount
      : t.state.sortKey === 'name' ? `${w.user.lastName} ${w.user.firstName}`.toLowerCase()
      : t.state.sortKey === 'status' ? w.status : new Date(w.createdAt).getTime();
    return [...rows].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * dir);
  }, [all, status, f, t.state.search, t.state.sortKey, t.state.sortDir]);

  const totalPages = Math.max(Math.ceil(filtered.length / t.state.pageSize), 1);
  const page = Math.min(t.state.page, totalPages);
  const pageRows = filtered.slice((page - 1) * t.state.pageSize, page * t.state.pageSize);
  const selectedRows = all.filter((w) => selected.has(w.id));

  const statusCards: HubCard[] = [
    { value: 'pending', label: 'À verser', tone: 'warning', count: counts['pending'] ?? 0, description: 'Virement à effectuer' },
    { value: 'paid', label: 'Versés', tone: 'success', count: counts['paid'] ?? 0, description: 'Virement effectué' },
    { value: 'rejected', label: 'Refusés', tone: 'danger', count: counts['rejected'] ?? 0, description: 'Solde recrédité' },
    { value: 'cancelled', label: 'Annulés', tone: 'default', count: counts['cancelled'] ?? 0, description: 'Annulés par le bénéficiaire' },
    { value: 'all', label: 'Toutes les demandes', count: counts['all'] },
  ];
  const statusLabelOf = status === 'all' ? 'Toutes les demandes' : STATUS[status]?.label ?? '';
  const backTo = () => { setSelected(new Set()); t.setFilter('status', ''); t.setSearch(''); };


  const columns: Column<Withdrawal>[] = [
    {
      key: 'name', header: 'Bénéficiaire', sortable: true,
      render: (w) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {w.user.firstName} {w.user.lastName}{' '}
            <Badge variant={isClient(w) ? 'default' : 'success'}>{typeLabel(w)}</Badge>
          </p>
          <p className="text-xs text-gray-500">{w.user.email}{w.user.phone ? ` · ${w.user.phone}` : ''}</p>
        </div>
      ),
    },
    { key: 'amount', header: 'Montant', sortable: true, render: (w) => <span className="font-semibold">{formatAmount(w.amount, 'FCFA')}</span> },
    {
      key: 'method', header: 'Coordonnées de versement',
      render: (w) => (
        <div className="text-xs">
          <p><span className="font-semibold">{METHOD[w.method] ?? w.method}</span>{w.bankName ? ` — ${w.bankName}` : ''}</p>
          <p className="text-gray-500">{w.holderName} · <span className="font-mono">{w.accountNumber}</span></p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Statut', sortable: true,
      render: (w) => (
        <div>
          <Badge variant={STATUS[w.status]?.tone ?? 'default'}>{STATUS[w.status]?.label ?? w.status}</Badge>
          {w.reference && <p className="text-xs text-gray-500 mt-1">Réf. {w.reference}</p>}
          {w.rejectionReason && <p className="text-xs text-danger-600 mt-1 max-w-[14rem] truncate" title={w.rejectionReason}>{w.rejectionReason}</p>}
        </div>
      ),
    },
    {
      key: 'createdAt', header: 'Demandé le', sortable: true,
      render: (w) => <span className="text-xs">{formatDateTime(w.createdAt)}{w.processedAt ? <><br /><span className="text-gray-400">traité {formatDateTime(w.processedAt)}</span></> : null}</span>,
    },
  ];

  const actions: BulkAction<Withdrawal>[] = [
    {
      key: 'paid', label: 'Marquer comme versé', icon: <CheckCircle size={14} />, variant: 'cta',
      confirmTitle: 'Marquer les demandes comme versées',
      confirmMessage: 'Confirmez que les virements ont bien été effectués pour :',
      reasonLabel: 'Référence du virement (facultatif)', reasonOptional: true,
      appliesTo: (w) => w.status === 'pending',
      run: (w, ref) => withdrawalsService.markPaid(w.id, ref || undefined),
    },
    {
      key: 'reject', label: 'Refuser', icon: <XCircle size={14} />, variant: 'danger',
      confirmTitle: 'Refuser les demandes',
      confirmMessage: 'Le solde sera recrédité aux bénéficiaires pour :', confirmLabel: 'Refuser',
      reasonLabel: 'Motif du refus (affiché au bénéficiaire)',
      appliesTo: (w) => w.status === 'pending',
      run: (w, reason) => withdrawalsService.reject(w.id, reason),
    },
  ];

  const handleExport = () => downloadCsv(
    filtered.map((w) => ({
      id: w.id, beneficiaire: `${w.user.firstName} ${w.user.lastName}`, type: typeLabel(w), email: w.user.email, montant: w.amount,
      moyen: METHOD[w.method] ?? w.method, titulaire: w.holderName, compte: w.accountNumber,
      statut: STATUS[w.status]?.label ?? w.status, reference: w.reference ?? '', demande_le: formatDateTime(w.createdAt),
    })),
    `versements_${status}_${new Date().toISOString().slice(0, 10)}`,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Retraits et versements</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Demandes des professionnels et des clients. Effectuez le dépôt sur les coordonnées indiquées, puis cliquez sur la demande et validez le versement.
          </p>
        </div>
        {depth === -1 && <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={!filtered.length}>Exporter la vue (CSV)</Button>}
      </div>

      <div className="-mt-2"><HubCrumbs items={[
        { label: 'Versements', onClick: depth === 0 ? undefined : () => backTo() },
        ...(status ? [{ label: statusLabelOf }] : []),
      ]} /></div>

      {depth === 0 && (
        <>
          <p className="text-sm text-gray-500">Choisissez un statut de demande.</p>
          <HubCards cards={statusCards} loading={isLoading || !t.hydrated} onSelect={(v) => { setSelected(new Set()); t.setFilter('status', v); }} />
        </>
      )}


      {depth === -1 && (
      <Card padding={false}>
        <FilterBar
          search={t.state.search} onSearch={t.setSearch}
          placeholder="Nom, email, titulaire, n° de compte, référence…"
          activeCount={Object.entries(f).filter(([k, v]) => k !== 'status' && v).length + (t.state.search ? 1 : 0)}
          onReset={() => { setSelected(new Set()); t.reset(NAV); }}
        >
          <select value={f['type'] ?? ''} onChange={(e) => t.setFilter('type', e.target.value)} className="input w-40" aria-label="Type de bénéficiaire">
            <option value="">Clients et pros</option>
            <option value="client">Clients</option>
            <option value="pro">Professionnels</option>
          </select>
          <select value={f['method'] ?? ''} onChange={(e) => t.setFilter('method', e.target.value)} className="input w-44" aria-label="Moyen de versement">
            <option value="">Tous les moyens</option>
            {Object.entries(METHOD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Du <input type="date" value={f['from'] ?? ''} onChange={(e) => t.setFilter('from', e.target.value)} className="input !py-1.5 w-36" />
            au <input type="date" value={f['to'] ?? ''} onChange={(e) => t.setFilter('to', e.target.value)} className="input !py-1.5 w-36" />
          </label>
        </FilterBar>

        <BulkActionBar<Withdrawal>
          items={selectedRows} getId={(w) => w.id} getName={(w) => `${w.user.firstName} ${w.user.lastName} · ${formatAmount(w.amount, 'FCFA')}`} actions={actions} noun="demande"
          onClear={() => setSelected(new Set())} onDone={() => qc.invalidateQueries({ queryKey: ['withdrawals'] })}
        />

        {isError ? <p className="text-center text-gray-400 py-10">Impossible de charger les versements.</p> : (
          <>
            <Table<Withdrawal>
              columns={columns} data={pageRows} loading={isLoading || !t.hydrated} keyExtractor={(w) => w.id}
              emptyMessage="Aucune demande ne correspond à ces filtres"
              sortKey={t.state.sortKey} sortDir={t.state.sortDir} onSort={t.setSort}
              selectable selectedIds={selected} onSelectionChange={setSelected}
              rowAccent={(w) => toneAccent[STATUS[w.status]?.tone ?? 'default']}
              onRowClick={openDetail}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={t.setPage} total={filtered.length} pageSize={t.state.pageSize} onPageSizeChange={t.setPageSize} />
          </>
        )}
      </Card>
      )}

      <Modal
        isOpen={!!detail}
        onClose={() => !busy && setDetail(null)}
        title="Demande de retrait"
        size="lg"
        footer={detail?.status === 'pending' ? (
          rejecting ? (
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setRejecting(false)} disabled={busy}>Retour</Button>
              <Button variant="danger" onClick={confirmReject} disabled={busy || !rejectReason.trim()} leftIcon={<XCircle size={14} />}>Confirmer le refus</Button>
            </div>
          ) : (
            <div className="flex w-full justify-between gap-2">
              <Button variant="outline" onClick={() => setRejecting(true)} disabled={busy} leftIcon={<XCircle size={14} />}>Refuser</Button>
              <Button onClick={confirmPaid} disabled={busy} leftIcon={<CheckCircle size={14} />}>Valider le versement</Button>
            </div>
          )
        ) : undefined}
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{detail.user.firstName} {detail.user.lastName}</p>
                <p className="text-gray-500">{detail.user.email}{detail.user.phone ? ` · ${detail.user.phone}` : ''}</p>
                <div className="mt-1 flex gap-2">
                  <Badge variant={isClient(detail) ? 'default' : 'success'}>{typeLabel(detail)}</Badge>
                  <Badge variant={STATUS[detail.status]?.tone ?? 'default'}>{STATUS[detail.status]?.label ?? detail.status}</Badge>
                </div>
              </div>
              <p className="whitespace-nowrap text-2xl font-bold text-gray-900 dark:text-gray-100">{formatAmount(detail.amount, 'FCFA')}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-xs uppercase tracking-wide text-gray-500">Déposer sur</p>
              <p className="mt-1 font-semibold">{METHOD[detail.method] ?? detail.method}{detail.bankName ? ` — ${detail.bankName}` : ''}</p>
              <p>Titulaire : {detail.holderName}</p>
              <p>Numéro : <span className="font-mono text-base">{detail.accountNumber}</span></p>
            </div>
            <p className="text-xs text-gray-500">
              Demandé le {formatDateTime(detail.createdAt)}{detail.processedAt ? ` · traité le ${formatDateTime(detail.processedAt)}` : ''}.
              {' '}Le montant est déjà réservé sur le portefeuille du bénéficiaire ; il est définitivement débité à la validation, ou recrédité en cas de refus.
            </p>
            {detail.reference && <p>Référence du dépôt : <span className="font-mono">{detail.reference}</span></p>}
            {detail.rejectionReason && <p className="text-danger-600">Motif du refus : {detail.rejectionReason}</p>}
            {detail.status === 'pending' && !rejecting && (
              <label className="block">
                <span className="text-xs text-gray-500">Référence du dépôt (facultatif)</span>
                <input className="input mt-1 w-full" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. ID de transaction Wave / Orange Money" />
              </label>
            )}
            {detail.status === 'pending' && rejecting && (
              <label className="block">
                <span className="text-xs text-gray-500">Motif du refus (affiché au bénéficiaire)</span>
                <textarea className="input mt-1 w-full" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              </label>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
