'use client';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatAmount, formatDate } from '@/lib/utils';
import { Users, Building2, Calendar, TrendingUp, AlertTriangle, CreditCard, Star, Activity } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const PALETTE = ['#1B5E20', '#2E7D32', '#43A047', '#F9A825', '#E65100', '#6A1B9A', '#0277BD'];

const BOOKING_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmées', pending_payment: 'En attente', completed: 'Terminées',
  cancelled_by_client: 'Annul. client', cancelled_by_professional: 'Annul. pro',
  cancelled: 'Annulées', refunded: 'Remboursées', disputed: 'Litiges',
};

export default function DashboardPage() {
  const { data: stats, isLoading, isError } = useQuery<any>({
    queryKey: ['dashboard-stats'],
    queryFn: analyticsService.getDashboardStats,
    retry: 1,
  });

  const kpis = [
    { label: 'Utilisateurs totaux',   value: (stats?.totalUsers ?? 0).toLocaleString('fr-FR'),  icon: Users,         color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Propriétés actives',    value: (stats?.activeProperties ?? 0).toLocaleString('fr-FR'), icon: Building2, color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Réservations ce mois',  value: (stats?.bookingsThisMonth ?? stats?.totalBookings ?? 0).toLocaleString('fr-FR'), icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Revenus (FCFA)',         value: formatAmount(stats?.revenueThisMonth ?? stats?.totalRevenue ?? 0), icon: CreditCard, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Litiges ouverts',        value: stats?.openDisputes ?? 0,     icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50' },
    { label: 'Taux de conversion',     value: `${stats?.conversionRate ?? 0}%`, icon: TrendingUp, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Note moyenne',           value: stats?.avgRating ? `★ ${Number(stats.avgRating).toFixed(1)}` : '—', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Activité (7j)',          value: (stats?.newUsersEvolution ?? []).reduce((s: number, r: any) => s + r.count, 0) + ' inscriptions', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  // Bookings by status for pie chart
  const bookingStatusPie = Object.entries(stats?.bookingsByStatus ?? {})
    .filter(([, v]) => Number(v) > 0)
    .map(([status, count]) => ({ name: BOOKING_STATUS_LABELS[status] ?? status, value: Number(count) }));

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500">Dernière mise à jour : {formatDate(new Date().toISOString())}</p>
        {isError && <p className="text-xs text-amber-600 mt-1">⚠ Impossible de charger les données en temps réel. Vérifiez la connexion à l'API.</p>}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg shrink-0 ${bg}`}><Icon size={20} className={color} /></div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{label}</p>
                <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Réservations (6 derniers mois)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.bookingsTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Réservations" fill="#1B5E20" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenus (6 derniers mois)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats?.revenueTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatAmount(v)} />
                <Line type="monotone" dataKey="amount" stroke="#F9A825" strokeWidth={2} dot={{ r: 3 }} name="Revenus (FCFA)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings by status */}
        {bookingStatusPie.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Réservations par statut</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={bookingStatusPie} dataKey="value" nameKey="name" cx="50%" cy="45%"
                    outerRadius={70} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {bookingStatusPie.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        <Card>
          <CardHeader><CardTitle>Alertes récentes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats?.recentAlerts ?? []).map((alert: { id: string; message: string; level: string; createdAt: string }, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <Badge variant={alert.level === 'error' ? 'danger' : alert.level === 'warn' ? 'warning' : 'info'}>
                    {alert.level}
                  </Badge>
                  <span className="text-gray-700 flex-1">{alert.message}</span>
                  <span className="text-gray-400 text-xs shrink-0">{formatDate(alert.createdAt)}</span>
                </div>
              ))}
              {(!stats?.recentAlerts || stats.recentAlerts.length === 0) && (
                <p className="text-gray-400 text-sm">Aucune alerte récente</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
