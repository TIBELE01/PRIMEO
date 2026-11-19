'use client';
// Versements — demandes de versement des professionnels. Le portefeuille Primeo est virtuel :
// l'administrateur effectue le virement (Mobile Money / banque) puis marque la demande comme versée.
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Download } from 'lucide-react';
import { withdrawalsService } from '@/services/api';
import { useTableState } from '@/hooks/useTableState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination, Column } from '@/components/ui/Table';
import { StatusTabs, TabItem } from '@/components/ui/StatusTabs';
import { FilterBar } from '@/components/ui/FilterBar';
import { BulkActionBar, BulkAction } from '@/components/ui/BulkActions';
import { formatAmount, formatDateTime, downloadCsv } from '@/lib/utils';
import { toneAccent } from '@/lib/status';

type Withdrawal = {
  id: string; amount: number; status: 'pending' | 'paid' | 'rejected' | 'cancelled';
  method: string; holderName: string; accountNumber: string; bankName?: string | null;
  reference?: string | null; rejectionReason?: string | null; createdAt: string; processedAt?: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string | null };
};

const METHOD: Record<string, string> = { orange_money: 'Orange Money', mtn_money: 'MTN Money', wave: 'Wave', moov_money: 'Moov Money', bank: 'Banque' };
const STATUS: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' | 'default' }> = {
  pending: { label: 'À verser', tone: 'warning' }, paid: { label: 'Versé', tone: 'success' },
  rejected: { label: 'Refusé', tone: 'danger' }, cancelled: { label: 'Annulé', tone: 'default' },
};

export default function WithdrawalsPage() {
  const qc = useQueryClient();
  const t = useTableState({ storageKey: 'withdrawals', defaultFilters: { status: 'pending' } });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const f = t.state.filters;
  const status = f['status'] ?? 'pending';

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

  const tabs: TabItem[] = [
    { value: 'pending', label: 'À verser', tone: 'warning', count: counts['pending'] ?? 0 },
    { value: 'paid', label: 'Versés', tone: 'success', count: counts['paid'] ?? 0 },
    { value: 'rejected', label: 'Refusés', tone: 'danger', count: counts['rejected'] ?? 0 },
    { value: 'cancelled', label: 'Annulés', tone: 'default', count: counts['cancelled'] ?? 0 },
    { value: 'all', label: 'Toutes', count: counts['all'] },
  ];

  const columns: Column<Withdrawal>[] = [
    {
      key: 'name', header: 'Professionnel', sortable: true,
      render: (w) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{w.user.firstName} {w.user.lastName}</p>
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
      confirmMessage: 'Le solde sera recrédité aux professionnels pour :', confirmLabel: 'Refuser',
      reasonLabel: 'Motif du refus (affiché au professionnel)',
      appliesTo: (w) => w.status === 'pending',
      run: (w, reason) => withdrawalsService.reject(w.id, reason),
    },
  ];

  const handleExport = () => downloadCsv(
    filtered.map((w) => ({
      id: w.id, professionnel: `${w.user.firstName} ${w.user.lastName}`, email: w.user.email, montant: w.amount,
      moyen: METHOD[w.method] ?? w.method, titulaire: w.holderName, compte: w.accountNumber,
      statut: STATUS[w.status]?.label ?? w.status, reference: w.reference ?? '', demande_le: formatDateTime(w.createdAt),
    })),
    `versements_${status}_${new Date().toISOString().slice(0, 10)}`,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Versements aux professionnels</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Le portefeuille Primeo est virtuel : effectuez le virement sur les coordonnées indiquées, puis marquez la demande comme versée.
          </p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={!filtered.length}>Exporter la vue (CSV)</Button>
      </div>

      <Card padding={false}>
        <div className="px-4 pt-4"><StatusTabs tabs={tabs} value={status} onChange={(v) => { setSelected(new Set()); t.setFilter('status', v); }} /></div>

        <FilterBar
          search={t.state.search} onSearch={t.setSearch}
          placeholder="Nom, email, titulaire, n° de compte, référence…"
          activeCount={Object.entries(f).filter(([k, v]) => k !== 'status' && v).length + (t.state.search ? 1 : 0)}
          onReset={() => { setSelected(new Set()); t.reset(['status']); }}
        >
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
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={t.setPage} total={filtered.length} pageSize={t.state.pageSize} onPageSizeChange={t.setPageSize} />
          </>
        )}
      </Card>
    </div>
  );
}
