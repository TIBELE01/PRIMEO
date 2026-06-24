'use client';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Users, CreditCard, TrendingUp, Calendar, Download,
  ImageIcon, MapPin, Trophy, RefreshCw, Star, Building2,
  AlertTriangle, Activity, BarChart2, Gift, Handshake,
} from 'lucide-react';
import { analyticsService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatAmount, formatPercent, downloadCsv, exportChartAsPng } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// ── Colours ──────────────────────────────────────────────────────────────────
const PALETTE  = ['#1B5E20', '#2E7D32', '#43A047', '#F9A825', '#E65100', '#6A1B9A', '#0277BD'];
const PALETTE2 = ['#0277BD', '#00838F', '#2E7D32', '#F57F17', '#6A1B9A', '#C62828', '#37474F'];

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmées',
  pending_payment: 'En attente',
  completed: 'Terminées',
  cancelled_by_client: 'Annul. client',
  cancelled_by_professional: 'Annul. pro',
  cancelled: 'Annulées',
  refunded: 'Remboursées',
  disputed: 'Litiges',
};
const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'default' | 'info' | 'danger'> = {
  confirmed: 'success', pending_payment: 'warning', completed: 'info',
  cancelled_by_client: 'danger', cancelled_by_professional: 'danger',
  cancelled: 'danger', refunded: 'default', disputed: 'warning',
};
const SOURCE_LABELS: Record<string, string> = {
  client_payment: 'Paiements clients',
  subscription_payment: 'Abonnements',
  boost_purchase: 'Boosts',
  market_report_purchase: 'Rapports marché',
  refund: 'Remboursements',
};
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  residence: 'Résidence', hotel: 'Hôtel',
  immobilier_location: 'Location', immobilier_achat: 'Vente',
  immobilier_terrain: 'Terrain', restaurant: 'Restaurant',
};
const ROLE_LABELS: Record<string, string> = {
  client: 'Clients',
  professional_hebergement: 'Hébergement',
  professional_immobilier: 'Immobilier',
  restaurateur: 'Restaurateur',
  admin: 'Admin',
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, bg, sub }: {
  label: string; value: string | number; icon: React.ElementType;
  color: string; bg: string; sub?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg shrink-0 ${bg}`}>
          <Icon size={22} className={color} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
          {sub && <div className="mt-1">{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <Icon size={18} className="text-primary-600" />
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
    </div>
  );
}

// ── Chart export button ───────────────────────────────────────────────────────
function ChartExportBtn({ containerRef, filename, data, csvColumns }: {
  // React 19 : useRef<T>(null) renvoie RefObject<T | null> — le type du prop doit l'accepter.
  containerRef: React.RefObject<HTMLDivElement | null>;
  filename: string; data: object[]; csvColumns: string[];
}) {
  return (
    <div className="flex gap-1">
      <button
        onClick={() => exportChartAsPng(containerRef.current, filename)}
        title="Exporter PNG"
        className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <ImageIcon size={14} />
      </button>
      <button
        onClick={() => downloadCsv(data.map(r => Object.fromEntries(csvColumns.map(c => [c, (r as any)[c]]))), filename)}
        title="Exporter CSV"
        className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Download size={14} />
      </button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function NoData() {
  return <p className="text-center text-gray-400 text-sm py-8">Aucune donnée disponible</p>;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const router = useRouter();
  const [exportingAll, setExportingAll] = useState(false);

  const revenueChartRef   = useRef<HTMLDivElement>(null);
  const bookingsChartRef  = useRef<HTMLDivElement>(null);
  const pieChartRef       = useRef<HTMLDivElement>(null);
  const geoChartRef       = useRef<HTMLDivElement>(null);
  const usersRoleRef      = useRef<HTMLDivElement>(null);
  const propTypeRef       = useRef<HTMLDivElement>(null);
  const dualAxisRef       = useRef<HTMLDivElement>(null);
  const bookingStatusRef  = useRef<HTMLDivElement>(null);
  const newUsersRef       = useRef<HTMLDivElement>(null);
  const ratingsRef        = useRef<HTMLDivElement>(null);
  const bookingsByTypeRef = useRef<HTMLDivElement>(null);
  const conversionRef     = useRef<HTMLDivElement>(null);

  const { data: stats, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: ['admin-dashboard'],
    queryFn: analyticsService.getDashboardStats,
    refetchInterval: 60_000,
  });

  const { data: advanced } = useQuery<any>({
    queryKey: ['admin-dashboard-advanced'],
    queryFn: analyticsService.getAdvancedStats,
    refetchInterval: 120_000,
  });

  const handleExportAll = async () => {
    if (!stats) return;
    setExportingAll(true);
    downloadCsv(
      [
        { metric: 'Total utilisateurs', value: stats.totalUsers },
        { metric: 'Total réservations', value: stats.totalBookings },
        { metric: 'Revenus du mois (FCFA)', value: stats.totalRevenue },
        { metric: 'Taux de commission moyen (%)', value: stats.avgCommissionRate },
        { metric: 'Litiges ouverts', value: stats.openDisputes },
        { metric: 'Propriétés actives', value: stats.activeProperties },
        { metric: 'Note moyenne', value: stats.avgRating ?? 'N/A' },
      ],
      'primeo-kpis',
    );
    setExportingAll(false);
  };

  // Revenue by source pie
  const pieData = Object.entries(stats?.revenueBySource ?? {})
    .filter(([, v]) => Number(v) > 0)
    .map(([type, amount]) => ({ name: SOURCE_LABELS[type] ?? type, value: Number(amount) }));

  // Users by role pie
  const userRoleData = Object.entries(stats?.usersByRole ?? {})
    .filter(([, v]) => Number(v) > 0)
    .map(([role, count]) => ({ name: ROLE_LABELS[role] ?? role, value: Number(count) }));

  // Properties by type
  const propTypeData = Object.entries(stats?.propertiesByType ?? {})
    .filter(([, v]) => Number(v) > 0)
    .map(([type, count]) => ({ name: PROPERTY_TYPE_LABELS[type] ?? type, value: Number(count) }));

  // Bookings by status
  const bookingStatusData = Object.entries(stats?.bookingsByStatus ?? {})
    .filter(([, v]) => Number(v) > 0)
    .map(([status, count]) => ({ name: STATUS_LABELS[status] ?? status, value: Number(count) }));

  // Combined trend: bookings + revenue per month
  const combinedTrend = (stats?.bookingsTrend ?? []).map((b: any, i: number) => {
    const rev = (stats?.revenueTrend ?? [])[i];
    return { month: b.month, bookings: b.count, revenue: rev?.amount ?? 0 };
  });

  const newUsersTotal = (stats?.newUsersEvolution ?? []).reduce((s: number, r: any) => s + r.count, 0);

  // Ratings distribution
  const ratingsData = stats?.ratingsDistribution
    ? Object.entries(stats.ratingsDistribution)
        .map(([star, count]) => ({ star: `${star}★`, count: Number(count) }))
    : [
        { star: '5★', count: stats?.ratings5 ?? 0 },
        { star: '4★', count: stats?.ratings4 ?? 0 },
        { star: '3★', count: stats?.ratings3 ?? 0 },
        { star: '2★', count: stats?.ratings2 ?? 0 },
        { star: '1★', count: stats?.ratings1 ?? 0 },
      ].filter(r => r.count > 0);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytiques</h1>
          <p className="text-sm text-gray-500 mt-0.5">Données en temps réel · mise à jour toutes les 60 s</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Download size={14} />} loading={exportingAll} onClick={handleExportAll}>
            Exporter KPIs
          </Button>
          <Button size="sm" onClick={() => router.push('/analytics/reports')}>Rapports</Button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Utilisateurs totaux"
          value={stats?.totalUsers?.toLocaleString('fr-FR') ?? 0}
          icon={Users} color="text-blue-600" bg="bg-blue-50"
          sub={<p className="text-xs text-green-600 font-medium">+{newUsersTotal} cette semaine</p>}
        />
        <KpiCard
          label="Réservations totales"
          value={stats?.totalBookings?.toLocaleString('fr-FR') ?? 0}
          icon={Calendar} color="text-purple-600" bg="bg-purple-50"
          sub={
            <div className="flex flex-wrap gap-1 mt-0.5">
              {Object.entries(stats?.bookingsByStatus ?? {}).slice(0, 3).map(([status, count]) => (
                <Badge key={status} variant={STATUS_VARIANTS[status] ?? 'default'} className="text-xs py-0">
                  {STATUS_LABELS[status] ?? status} {String(count)}
                </Badge>
              ))}
            </div>
          }
        />
        <KpiCard
          label="CA du mois (FCFA)"
          value={formatAmount(stats?.totalRevenue ?? 0)}
          icon={CreditCard} color="text-yellow-600" bg="bg-yellow-50"
        />
        <KpiCard
          label="Commission moyenne"
          value={formatPercent(stats?.avgCommissionRate ?? 0)}
          icon={TrendingUp} color="text-green-700" bg="bg-green-50"
          sub={<p className="text-xs text-gray-400">{stats?.openDisputes ?? 0} litiges ouverts</p>}
        />
        <KpiCard
          label="Propriétés actives"
          value={(stats?.activeProperties ?? 0).toLocaleString('fr-FR')}
          icon={Building2} color="text-teal-600" bg="bg-teal-50"
          sub={<p className="text-xs text-gray-400">{stats?.pendingProperties ?? 0} en attente</p>}
        />
        <KpiCard
          label="Note moyenne"
          value={stats?.avgRating ? `★ ${Number(stats.avgRating).toFixed(1)}` : '—'}
          icon={Star} color="text-yellow-500" bg="bg-yellow-50"
        />
        <KpiCard
          label="Litiges ouverts"
          value={stats?.openDisputes ?? 0}
          icon={AlertTriangle} color="text-red-600" bg="bg-red-50"
          sub={<p className="text-xs text-gray-400">{stats?.resolvedDisputes ?? 0} résolus ce mois</p>}
        />
        <KpiCard
          label="Taux de conversion"
          value={formatPercent(stats?.conversionRate ?? 0)}
          icon={Activity} color="text-indigo-600" bg="bg-indigo-50"
        />
      </div>

      {/* ── Section: Réservations & Revenus ── */}
      <SectionTitle icon={Calendar} title="Réservations & Revenus" />

      {/* Charts row 1: Bookings trend + Revenue by source */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Réservations — 6 derniers mois</CardTitle>
            <ChartExportBtn containerRef={bookingsChartRef} filename="primeo-reservations-tendance"
              data={stats?.bookingsTrend ?? []} csvColumns={['month', 'count']} />
          </CardHeader>
          <CardContent>
            <div ref={bookingsChartRef}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats?.bookingsTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Réservations" fill="#1B5E20" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenus par source</CardTitle>
            <ChartExportBtn containerRef={pieChartRef} filename="primeo-revenus-sources"
              data={pieData} csvColumns={['name', 'value']} />
          </CardHeader>
          <CardContent>
            <div ref={pieChartRef}>
              {pieData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={75}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatAmount(v)} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Revenue trend + Dual-axis (bookings vs revenue) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenus (FCFA) — 6 derniers mois</CardTitle>
            <ChartExportBtn containerRef={revenueChartRef} filename="primeo-revenus-tendance"
              data={stats?.revenueTrend ?? []} csvColumns={['month', 'amount']} />
          </CardHeader>
          <CardContent>
            <div ref={revenueChartRef}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats?.revenueTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatAmount(v)} />
                  <Line type="monotone" dataKey="amount" stroke="#F9A825" strokeWidth={2} dot={{ r: 3 }} name="Revenus" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-gray-400" />
              <CardTitle>Réservations vs Revenus</CardTitle>
            </div>
            <ChartExportBtn containerRef={dualAxisRef} filename="primeo-reservations-vs-revenus"
              data={combinedTrend} csvColumns={['month', 'bookings', 'revenue']} />
          </CardHeader>
          <CardContent>
            <div ref={dualAxisRef}>
              {combinedTrend.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={combinedTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number, name: string) =>
                      name === 'Revenus (FCFA)' ? formatAmount(v) : v} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="bookings" name="Réservations" fill="#1B5E20" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#F9A825"
                      strokeWidth={2} dot={{ r: 3 }} name="Revenus (FCFA)" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section: Utilisateurs ── */}
      <SectionTitle icon={Users} title="Utilisateurs" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New users 7 days */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Nouvelles inscriptions — 7 derniers jours</CardTitle>
            <span className="text-sm text-gray-500 font-normal">Total : {newUsersTotal}</span>
          </CardHeader>
          <CardContent>
            <div ref={newUsersRef}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats?.newUsersEvolution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }}
                    tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />
                  <Bar dataKey="count" name="Inscriptions" fill="#0277BD" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Users by role */}
        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs par rôle</CardTitle>
            <ChartExportBtn containerRef={usersRoleRef} filename="primeo-utilisateurs-roles"
              data={userRoleData} csvColumns={['name', 'value']} />
          </CardHeader>
          <CardContent>
            <div ref={usersRoleRef}>
              {userRoleData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={userRoleData} dataKey="value" nameKey="name" cx="50%" cy="45%"
                      outerRadius={70} innerRadius={35}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {userRoleData.map((_, i) => <Cell key={i} fill={PALETTE2[i % PALETTE2.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section: Propriétés ── */}
      <SectionTitle icon={Building2} title="Propriétés" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Properties by type */}
        <Card>
          <CardHeader>
            <CardTitle>Propriétés par type</CardTitle>
            <ChartExportBtn containerRef={propTypeRef} filename="primeo-proprietes-types"
              data={propTypeData} csvColumns={['name', 'value']} />
          </CardHeader>
          <CardContent>
            <div ref={propTypeRef}>
              {propTypeData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={propTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="value" name="Propriétés" fill="#43A047" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Geographic distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              <CardTitle>Répartition géographique</CardTitle>
            </div>
            <ChartExportBtn containerRef={geoChartRef} filename="primeo-reservations-villes"
              data={stats?.bookingsByCity ?? []} csvColumns={['city', 'count', 'revenue']} />
          </CardHeader>
          <CardContent>
            <div ref={geoChartRef}>
              {(!stats?.bookingsByCity || stats.bookingsByCity.length === 0) ? <NoData /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.bookingsByCity} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="city" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(v: number, name: string) => name === 'Revenus (FCFA)' ? formatAmount(v) : v} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="count" name="Réservations" fill="#2E7D32" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section: Qualité & Statuts ── */}
      <SectionTitle icon={Star} title="Qualité & Statuts" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings by status */}
        <Card>
          <CardHeader>
            <CardTitle>Réservations par statut</CardTitle>
            <ChartExportBtn containerRef={bookingStatusRef} filename="primeo-reservations-statuts"
              data={bookingStatusData} csvColumns={['name', 'value']} />
          </CardHeader>
          <CardContent>
            <div ref={bookingStatusRef}>
              {bookingStatusData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={bookingStatusData} dataKey="value" nameKey="name" cx="50%" cy="45%"
                      outerRadius={75} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {bookingStatusData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ratings distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution des notes</CardTitle>
            <ChartExportBtn containerRef={ratingsRef} filename="primeo-notes-distribution"
              data={ratingsData} csvColumns={['star', 'count']} />
          </CardHeader>
          <CardContent>
            <div ref={ratingsRef}>
              {ratingsData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ratingsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="star" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Avis" fill="#F9A825" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section: Analytiques avancées ── */}
      <SectionTitle icon={BarChart2} title="Analytiques avancées — Réservations & Conversions" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings by property type */}
        <Card>
          <CardHeader>
            <CardTitle>Réservations par type de bien</CardTitle>
            <ChartExportBtn containerRef={bookingsByTypeRef} filename="primeo-reservations-types"
              data={advanced?.bookingsByPropertyType ?? []} csvColumns={['propertyType', 'count', 'revenue']} />
          </CardHeader>
          <CardContent>
            <div ref={bookingsByTypeRef}>
              {(!advanced?.bookingsByPropertyType || advanced.bookingsByPropertyType.length === 0) ? <NoData /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={advanced.bookingsByPropertyType.map((r: any) => ({
                    ...r, name: PROPERTY_TYPE_LABELS[r.propertyType] ?? r.propertyType,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number, name: string) => name === 'Revenus (FCFA)' ? formatAmount(v) : v} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="count" name="Réservations" fill="#1B5E20" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="revenue" name="Revenus (FCFA)" fill="#F9A825" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversion rate by property type */}
        <Card>
          <CardHeader>
            <CardTitle>Taux de conversion par type de bien</CardTitle>
            <ChartExportBtn containerRef={conversionRef} filename="primeo-conversion-types"
              data={advanced?.conversionByPropertyType ?? []} csvColumns={['propertyType', 'conversionRate']} />
          </CardHeader>
          <CardContent>
            <div ref={conversionRef}>
              {(!advanced?.conversionByPropertyType || advanced.conversionByPropertyType.length === 0) ? <NoData /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={advanced.conversionByPropertyType.map((r: any) => ({
                    ...r, name: PROPERTY_TYPE_LABELS[r.propertyType] ?? r.propertyType,
                  }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                    <Bar dataKey="conversionRate" name="Taux de conversion" fill="#0277BD" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section: Top partenaires ── */}
      <SectionTitle icon={Handshake} title="Top partenaires (6 derniers mois)" />

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['#', 'Partenaire', 'Réservations', 'CA généré (FCFA)'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(advanced?.topPartners ?? []).map((p: any, i: number) => (
                <tr key={p.ownerId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-gray-400">#{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.bookingCount.toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatAmount(p.totalRevenue)}</td>
                </tr>
              ))}
              {(!advanced?.topPartners || advanced.topPartners.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Aucune donnée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Section: Programme de parrainage ── */}
      <SectionTitle icon={Gift} title="Programme de parrainage" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Parrainages en attente"
          value={(advanced?.referralProgram?.pending?.count ?? 0).toLocaleString('fr-FR')}
          icon={Users} color="text-yellow-600" bg="bg-yellow-50"
        />
        <KpiCard
          label="Récompenses versées"
          value={(advanced?.referralProgram?.rewarded?.count ?? 0).toLocaleString('fr-FR')}
          icon={Gift} color="text-green-600" bg="bg-green-50"
          sub={<p className="text-xs text-gray-400">{formatAmount(advanced?.referralProgram?.rewarded?.totalAmount ?? 0)} FCFA distribués</p>}
        />
        <KpiCard
          label="Qualifient pour distribution"
          value={(advanced?.referralProgram?.pendingQualifyingForReward ?? 0).toLocaleString('fr-FR')}
          icon={TrendingUp} color="text-blue-600" bg="bg-blue-50"
          sub={<p className="text-xs text-gray-400">prochaine distribution à 06:00 UTC</p>}
        />
        <KpiCard
          label="Montant total distribué"
          value={formatAmount(advanced?.referralProgram?.rewarded?.totalAmount ?? 0)}
          icon={CreditCard} color="text-indigo-600" bg="bg-indigo-50"
        />
      </div>

      {/* ── Top 10 properties ── */}
      <Card padding={false}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-yellow-500" />
            <h3 className="font-semibold text-gray-900">Top 10 propriétés</h3>
          </div>
          <Button variant="outline" size="sm" leftIcon={<Download size={14} />}
            onClick={() => downloadCsv(
              (stats?.topProperties ?? []).map((p: any) => ({
                id: p.id, titre: p.title, ville: p.city,
                type: PROPERTY_TYPE_LABELS[p.propertyType] ?? p.propertyType,
                reservations: p.bookingsCount, note: p.rating?.toFixed(1) ?? 'N/A',
                vues: p.viewsCount ?? 0,
                proprietaire: `${p.owner?.firstName ?? ''} ${p.owner?.lastName ?? ''}`.trim(),
              })),
              'primeo-top-proprietes',
            )}
          >
            CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['#', 'Propriété', 'Ville', 'Type', 'Réservations', 'Note', 'Vues', 'Propriétaire'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(stats?.topProperties ?? []).map((p: any, i: number) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-gray-400">#{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[180px] truncate">{p.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.city}</td>
                  <td className="px-4 py-3"><Badge variant="default">{PROPERTY_TYPE_LABELS[p.propertyType] ?? p.propertyType}</Badge></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{p.bookingsCount}</td>
                  <td className="px-4 py-3 text-sm text-yellow-600 font-medium">
                    {p.rating !== null && p.rating !== undefined ? `★ ${Number(p.rating).toFixed(1)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{(p.viewsCount ?? 0).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p.owner ? `${p.owner.firstName} ${p.owner.lastName}` : '—'}
                  </td>
                </tr>
              ))}
              {(!stats?.topProperties || stats.topProperties.length === 0) && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucune donnée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
