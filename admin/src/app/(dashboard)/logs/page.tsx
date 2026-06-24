'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { logsService } from '@/services/api';
import { useDataTable } from '@/hooks/useDataTable';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Pagination } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Download, Filter, X, ChevronDown, ChevronRight } from 'lucide-react';
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

const ACTION_TYPES = [
  { value: '', label: 'Tous types' },
  { value: 'admin.user', label: 'Gestion utilisateurs' },
  { value: 'admin.property', label: 'Propriétés' },
  { value: 'admin.dispute', label: 'Litiges' },
  { value: 'admin.promo_code', label: 'Codes promo' },
  { value: 'admin.config', label: 'Configuration' },
  { value: 'admin.email_template', label: 'Templates email' },
  { value: 'admin.client_rating', label: 'Évaluations' },
  { value: 'featureFlag', label: 'Feature flags' },
];

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
          <tr className="text-gray-400">
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
              <tr key={k} className={changed ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}>
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
  const [exporting, setExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    queryParams, page, totalPages,
    handleSearch, handleFilter, handlePageChange, setTotalPages,
  } = useDataTable();

  const builtParams = {
    ...queryParams,
    ...(dateFrom && { from: new Date(dateFrom).toISOString() }),
    ...(dateTo && { to: new Date(dateTo + 'T23:59:59').toISOString() }),
    ...(userSearch && { userId: userSearch }),
  };

  const { data, isLoading } = useQuery<any>({
    queryKey: ['logs', builtParams],
    queryFn: () => logsService.getAuditLogs(builtParams),
  });

  useEffect(() => {
    if (data?.total && data?.limit) setTotalPages(Math.ceil(data.total / data.limit));
  }, [data, setTotalPages]);

  const hasFilters = !!(queryParams.search || dateFrom || dateTo || userSearch ||
    (queryParams as any).action || (queryParams as any).targetType);

  const resetFilters = () => {
    handleSearch('');
    handleFilter('action', '');
    handleFilter('targetType', '');
    setDateFrom('');
    setDateTo('');
    setUserSearch('');
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csv = await logsService.exportCsv({ ...builtParams, limit: 10000, page: 1 });
      const blob = new Blob([csv as string], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur lors de l\'export CSV');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: 'createdAt',
      header: 'Date',
      render: (l: AuditLog) => <span className="whitespace-nowrap">{formatDateTime(l.createdAt)}</span>,
    },
    {
      key: 'level',
      header: 'Niveau',
      render: (l: AuditLog) => {
        const level = deriveLevel(l.action);
        return <Badge variant={levelVariant[level] ?? 'default'}>{level}</Badge>;
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (l: AuditLog) => <span className="font-mono text-xs text-gray-700">{l.action}</span>,
    },
    {
      key: 'user',
      header: 'Administrateur',
      render: (l: AuditLog) =>
        l.user
          ? <span className="text-sm">{l.user.firstName} {l.user.lastName}</span>
          : <span className="text-gray-400 text-xs">Système</span>,
    },
    {
      key: 'targetType',
      header: 'Cible',
      render: (l: AuditLog) => (
        <span className="text-xs text-gray-500">
          {l.targetType}{l.targetId ? ` · ${l.targetId.slice(0, 8)}…` : ''}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (l: AuditLog) => {
        const hasMetadata = !!(l.metadata && (
          Object.keys(l.metadata.old ?? {}).length > 0 ||
          Object.keys(l.metadata.new ?? {}).length > 0
        ));
        const isExpanded = expandedId === l.id;
        return (
          <div>
            <div className="flex items-start gap-1">
              <span className="text-sm text-gray-600 max-w-xs truncate block" title={l.description}>
                {l.description}
              </span>
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
      className: 'max-w-sm',
    },
    {
      key: 'ipAddress',
      header: 'IP',
      render: (l: AuditLog) => <span className="text-xs text-gray-400 font-mono">{l.ipAddress ?? '—'}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journaux d'audit</h1>
          <p className="text-xs text-gray-400 mt-0.5">Conservation 6 mois · {data?.total ?? 0} entrées</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download size={14} />}
          loading={exporting}
          onClick={handleExportCsv}
        >
          Exporter CSV
        </Button>
      </div>

      <Card padding={false}>
        {/* Filters bar */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              placeholder="Rechercher une action ou description…"
              onChange={(e) => handleSearch(e.target.value)}
              className="input flex-1 min-w-48"
            />
            <select
              onChange={(e) => handleFilter('action', e.target.value)}
              className="input w-52"
              defaultValue=""
            >
              {ACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              onChange={(e) => handleFilter('targetType', e.target.value)}
              className="input w-44"
              defaultValue=""
            >
              {TARGET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">
                <Filter size={12} className="inline mr-1" />Du
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">au</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input text-sm"
              />
            </div>
            <input
              type="text"
              placeholder="Filtrer par ID utilisateur…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="input w-56 text-sm font-mono"
            />
            {hasFilters && (
              <Button variant="ghost" size="sm" leftIcon={<X size={14} />} onClick={resetFilters}>
                Effacer filtres
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <PageSpinner />
        ) : (
          <>
            <Table
              columns={columns}
              data={data?.data ?? []}
              keyExtractor={(l: AuditLog) => l.id}
              onRowClick={(l: AuditLog) => router.push(`/logs/${l.id}`)}
              emptyMessage="Aucun journal trouvé pour ces critères"
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </Card>
    </div>
  );
}
