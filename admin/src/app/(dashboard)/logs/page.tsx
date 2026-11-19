'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { logsService } from '@/services/api';
import { useTableState } from '@/hooks/useTableState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination, Column } from '@/components/ui/Table';
import { StatusTabs, TabItem } from '@/components/ui/StatusTabs';
import { FilterBar } from '@/components/ui/FilterBar';
import { formatDateTime } from '@/lib/utils';
import { toneAccent } from '@/lib/status';
import { useRouter } from 'next/navigation';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface AuditLog {
  id: string;
  action: string;
  userId?: string;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
  targetType: string;
  targetId: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
  metadata?: { old?: Record<string, unknown>; new?: Record<string, unknown> } | null;
}

const levelVariant: Record<string, 'info' | 'warning' | 'danger' | 'default'> = {
  info: 'info', warn: 'warning', error: 'danger', debug: 'default',
};

function deriveLevel(action: string): 'info' | 'warning' | 'danger' | 'default' {
  if (action.includes('ban') || action.includes('delete') || action.includes('error')) return 'danger';
  if (action.includes('suspend') || action.includes('reject') || action.includes('hide')) return 'warning';
  return 'info';
}

// Catégories d'actions (onglets) — filtre « action contient … »
const CATEGORY_TABS: TabItem[] = [
  { value: '', label: 'Toutes' },
  { value: 'admin.user', label: 'Utilisateurs' },
  { value: 'admin.kyc', label: 'KYC' },
  { value: 'admin.property', label: 'Propriétés' },
  { value: 'admin.menu', label: 'Plats' },
  { value: 'booking', label: 'Réservations' },
  { value: 'admin.dispute', label: 'Litiges' },
  { value: 'admin.promo_code', label: 'Codes promo' },
  { value: 'admin.website', label: 'Site vitrine' },
  { value: 'admin.config', label: 'Configuration' },
];

const levelTone: Record<string, 'info' | 'warning' | 'danger' | 'default'> = { info: 'info', warning: 'warning', danger: 'danger', default: 'default' };
const levelLabel: Record<string, string> = { info: 'Info', warning: 'Attention', danger: 'Critique', default: 'Debug' };

const PERIODS = [
  { value: '', label: 'Toute période' },
  { value: '1d', label: "Aujourd'hui" },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
];
const periodStart = (v: string) => new Date(Date.now() - ({ '1d': 1, '7d': 7, '30d': 30 } as Record<string, number>)[v]! * 86_400_000).toISOString();

const TARGET_TYPES = [
  { value: '', label: 'Toutes cibles' },
  { value: 'user', label: 'Utilisateur' },
  { value: 'property', label: 'Propriété' },
  { value: 'booking', label: 'Réservation' },
  { value: 'dispute', label: 'Litige' },
  { value: 'promo_code', label: 'Code promo' },
  { value: 'platform_config', label: 'Configuration' },
  { value: 'client_rating', label: 'Évaluation client' },
  { value: 'feature_flag', label: 'Feature flag' },
];

// Affiche les paires clé/valeur d'un objet metadata en format compact
function MetaDiff({ log }: { log: AuditLog }) {
  const meta = log.metadata;
  if (!meta || (!meta.old && !meta.new)) return null;

  const keys = Array.from(new Set([
    ...Object.keys(meta.old ?? {}),
    ...Object.keys(meta.new ?? {}),
  ]));

  if (keys.length === 0) return null;

  return (
    <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2 text-xs font-mono">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-gray-400 dark:text-gray-500">
            <th className="text-left pb-1 pr-4 font-medium">Champ</th>
            <th className="text-left pb-1 pr-4 font-medium text-orange-500">Avant</th>
            <th className="text-left pb-1 font-medium text-green-600">Après</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const oldVal = meta.old?.[k];
            const newVal = meta.new?.[k];
            const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
            return (
              <tr key={k} className={changed ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}>
                <td className="pr-4 py-0.5">{k}</td>
                <td className="pr-4 py-0.5 text-orange-600">
                  {oldVal !== undefined ? String(oldVal) : <span className="italic text-gray-300">—</span>}
                </td>
                <td className="py-0.5 text-green-700">
                  {newVal !== undefined ? String(newVal) : <span className="italic text-gray-300">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function LogsPage() {
  const router = useRouter();
  const toast = useToast();
  const t = useTableState({ storageKey: 'logs', defaultPageSize: 50 });
  const [exporting, setExporting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const category = t.state.filters['action'] ?? '';

  // La période rapide est convertie en bornes ; les dates saisies ont priorité
  const f = t.state.filters;
  const params: Record<string, string | number> = { ...t.queryParams };
  delete params['period'];
  if (f['period'] && !f['from']) params['from'] = periodStart(f['period']);

  const { data, isLoading, isError, isFetching } = useQuery<any>({
    queryKey: ['logs', params],
    queryFn: () => logsService.getAuditLogs(params),
    enabled: t.hydrated,
    placeholderData: keepPreviousData,
  });

  const logs: AuditLog[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.pages ?? Math.max(Math.ceil(total / t.state.pageSize), 1);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csv = await logsService.exportCsv({ ...params, limit: 10000, page: 1 });
      const blob = new Blob([typeof csv === 'string' ? csv : JSON.stringify(csv)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erreur lors de l'export CSV");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<AuditLog>[] = [
    { key: 'createdAt', header: 'Date', sortable: true, render: (l) => <span className="whitespace-nowrap text-xs">{formatDateTime(l.createdAt)}</span> },
    {
      key: 'level', header: 'Niveau',
      render: (l) => { const lv = deriveLevel(l.action); return <Badge variant={levelTone[lv] ?? 'default'}>{levelLabel[lv]}</Badge>; },
    },
    { key: 'action', header: 'Action', sortable: true, render: (l) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{l.action}</span> },
    {
      key: 'user', header: 'Administrateur',
      render: (l) => (l.user ? <span className="text-xs">{l.user.firstName} {l.user.lastName}</span> : <span className="text-gray-400 text-xs">Système</span>),
    },
    {
      key: 'targetType', header: 'Cible', sortable: true,
      render: (l) => <span className="text-xs text-gray-500">{l.targetType}{l.targetId ? ` · ${l.targetId.slice(0, 8)}…` : ''}</span>,
    },
    {
      key: 'description', header: 'Description', className: 'max-w-sm',
      render: (l) => {
        const hasMetadata = !!(l.metadata && (Object.keys(l.metadata.old ?? {}).length > 0 || Object.keys(l.metadata.new ?? {}).length > 0));
        const isExpanded = expandedId === l.id;
        return (
          <div>
            <div className="flex items-start gap-1">
              <span className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate block" title={l.description}>{l.description}</span>
              {hasMetadata && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : l.id); }}
                  className="shrink-0 text-gray-400 hover:text-gray-600 mt-0.5"
                  title={isExpanded ? 'Masquer les modifications' : 'Voir les modifications'}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
            </div>
            {isExpanded && <MetaDiff log={l} />}
          </div>
        );
      },
    },
    { key: 'ipAddress', header: 'IP', render: (l) => <span className="text-xs text-gray-400 font-mono">{l.ipAddress ?? '—'}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Journaux d&apos;audit</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString('fr-FR')} entrée{total > 1 ? 's' : ''} · conservation 6 mois · journal non modifiable</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download size={14} />} loading={exporting} onClick={handleExportCsv}>Exporter la vue (CSV)</Button>
      </div>

      <Card padding={false}>
        <div className="px-4 pt-2"><StatusTabs variant="underline" tabs={CATEGORY_TABS} value={category} onChange={(v) => t.setFilter('action', v)} /></div>

        <FilterBar
          search={t.state.search} onSearch={t.setSearch}
          placeholder="Rechercher une action, une description, un administrateur…"
          activeCount={t.activeFilterCount}
          onReset={() => t.reset()}
        >
          <select value={f['targetType'] ?? ''} onChange={(e) => t.setFilter('targetType', e.target.value)} className="input w-44" aria-label="Type de cible">
            {TARGET_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={f['period'] ?? ''} onChange={(e) => t.setFilters({ period: e.target.value, from: '', to: '' })} className="input w-44" aria-label="Période">
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Du <input type="date" value={f['from'] ?? ''} onChange={(e) => t.setFilters({ from: e.target.value, period: '' })} className="input !py-1.5 w-36" />
            au <input type="date" value={f['to'] ?? ''} onChange={(e) => t.setFilters({ to: e.target.value, period: '' })} className="input !py-1.5 w-36" />
          </label>
          <input
            type="text" value={f['userId'] ?? ''} onChange={(e) => t.setFilter('userId', e.target.value.trim())}
            placeholder="ID administrateur…" className="input w-44 font-mono text-sm" aria-label="Filtrer par ID administrateur"
          />
        </FilterBar>

        {isError ? <p className="text-center text-gray-400 py-10">Impossible de charger les journaux.</p> : (
          <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
            <Table<AuditLog>
              columns={columns} data={logs} loading={isLoading || !t.hydrated} keyExtractor={(l) => l.id}
              onRowClick={(l) => router.push(`/logs/${l.id}`)}
              emptyMessage="Aucune entrée ne correspond à ces critères"
              sortKey={t.state.sortKey} sortDir={t.state.sortDir} onSort={t.setSort}
              rowAccent={(l) => toneAccent[deriveLevel(l.action)]}
            />
            <Pagination page={t.state.page} totalPages={totalPages} onPageChange={t.setPage} total={total} pageSize={t.state.pageSize} onPageSizeChange={t.setPageSize} />
          </div>
        )}
      </Card>
    </div>
  );
}
