import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { boostsApi } from '../../../services/api/endpoints/boosts';
import { analyticsApi } from '../../../services/api/endpoints/analyticsApi';
import { useProTheme } from '../../../hooks/useProTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyStat {
  id: string;
  name: string;
  views: number;
  clicks: number;
  bookingAttempts: number;
  bookings: number;
  revenue: number;
  conversion: number;
}

interface DayStat {
  date: string;
  views: number;
  clicks: number;
  bookingAttempts: number;
  bookings: number;
  revenue: number;
}

interface DetailedStats {
  views: number;
  clicks: number;
  bookingAttempts: number;
  bookings: number;
  conversionRate: number;
  revenue: number;
  netRevenue: number;
  generatedAt?: string;
  daily: DayStat[];
  properties: PropertyStat[];
}

// Actualisation automatique tant que l'écran est affiché
const AUTO_REFRESH_MS = 60_000;

type Period = '7d' | '30d' | '90d' | '1y';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n?: number | null): string {
  return (n ?? 0).toLocaleString('fr-CI');
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  iconName,
  iconColor = '#1056E0',
}: {
  label: string;
  value: string | number;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
}) {
  return (
    <View style={kpiStyles.card}>
      <View style={[kpiStyles.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>
      <Text style={kpiStyles.value}>{value}</Text>
      <Text style={kpiStyles.label}>{label}</Text>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  iconWrap: { borderRadius: 8, padding: 7, marginBottom: 10 },
  value: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 3 },
  label: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
});

function BarChart({
  data,
  labels,
  color = '#1056E0',
  height = 110,
}: {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const bars = data.slice(0, 7);
  const labs = labels.slice(0, 7);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: height + 28 }}>
      {bars.map((val, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
          <View
            style={{
              width: '75%',
              height: Math.max(Math.round((val / max) * height), 3),
              backgroundColor: color,
              borderRadius: 4,
            }}
          />
          <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 4 }}>{labs[i]}</Text>
        </View>
      ))}
    </View>
  );
}

function LineChart({ data, color = '#1056E0', height = 90 }: {
  data: number[]; color?: string; height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const chartW = SCREEN_WIDTH - 80;
  const step = chartW / (data.length - 1);
  const points = data.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 8),
  }));
  return (
    <View style={{ height: height + 4, overflow: 'hidden', position: 'relative' }}>
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        // Position at midpoint so center-origin rotation (RN default) is correct
        const midX = (p.x + next.x) / 2;
        const midY = (p.y + next.y) / 2;
        return (
          <View key={i} style={{
            position: 'absolute', left: midX - len / 2, top: midY - 1,
            width: len, height: 2,
            backgroundColor: color, opacity: 0.85,
            transform: [{ rotate: `${angle}deg` }],
          }} />
        );
      })}
      {points.map((p, i) => (
        <View key={`d${i}`} style={{
          position: 'absolute', left: p.x - 3, top: p.y - 3,
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: color,
        }} />
      ))}
    </View>
  );
}

function FunnelStep({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const barWidth = `${Math.max(pct, 2)}%`;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: '#374151', fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 12, color: '#6B7280' }}>{value.toLocaleString('fr-CI')} ({pct.toFixed(1)}%)</Text>
      </View>
      <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: 8, width: barWidth as any, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

// ─── Locked screen ────────────────────────────────────────────────────────────

function LockedScreen({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.lockedContainer}>
        <View style={styles.lockIconWrap}>
          <Text style={styles.lockEmoji}>🔒</Text>
        </View>
        <Text style={styles.lockedTitle}>Statistiques avancées</Text>
        <Text style={styles.lockedSubtitle}>Disponible avec les formules Business et Entreprise</Text>
        <Text style={styles.lockedDesc}>
          Vues, clics, tentatives de réservation, réservations confirmées, taux de conversion et revenus, actualisés en temps réel
        </Text>
        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Voir les formules">
          <Ionicons name="arrow-up-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.upgradeBtnText}>Voir les formules</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const navigation = useNavigation<any>();
  const theme = useProTheme();
  const isFocused = useIsFocused();

  const [plan, setPlan] = useState<string | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('30d');

  // Formule du professionnel (les statistiques détaillées sont réservées à Business/Entreprise)
  useEffect(() => {
    (async () => {
      try {
        const res = await boostsApi.getBalance();
        const d = res.data?.data ?? res.data;
        setPlan(d?.planType ?? d?.plan ?? 'starter');
      } catch {
        setPlan('starter');
      } finally {
        setIsLoadingPlan(false);
      }
    })();
  }, []);

  const isLocked = plan !== null && !['business', 'entreprise'].includes(plan.toLowerCase());

  const fetchStats = useCallback(async (p: Period, mode: 'initial' | 'pull' | 'silent' = 'initial') => {
    if (mode === 'initial') setIsLoadingStats(true);
    if (mode === 'pull') setIsRefreshing(true);
    try {
      const res = await analyticsApi.getDetailedStats({ period: p });
      const d = res.data?.data ?? res.data;
      setStats(d as DetailedStats);
      setError(null);
    } catch (e: any) {
      if (mode !== 'silent') setError(e?.response?.data?.message ?? 'Impossible de charger les statistiques');
    } finally {
      setIsLoadingStats(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isLocked && !isLoadingPlan) fetchStats(period);
  }, [isLocked, isLoadingPlan, period, fetchStats]);

  // Temps réel : rafraîchit au retour sur l'écran puis toutes les 60 s tant qu'il est affiché
  useEffect(() => {
    if (isLocked || isLoadingPlan || !isFocused) return;
    fetchStats(period, 'silent');
    const timer = setInterval(() => fetchStats(period, 'silent'), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [isFocused, isLocked, isLoadingPlan, period, fetchStats]);

  if (isLoadingPlan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isLocked) {
    return <LockedScreen onUpgrade={() => navigation.navigate('Subscriptions')} />;
  }

  // ── Données des graphiques ─────────────────────────────────────────────────
  const daily = stats?.daily ?? [];
  const last7 = daily.slice(-7);
  const viewsLast7 = last7.map(d => d.views);
  const revenueLast7 = last7.map(d => d.revenue);
  const labels7 = last7.map(d => shortDate(d.date));
  const viewsTrend = daily.map(d => d.views);

  const totalViews = stats?.views ?? 0;
  const totalAttempts = stats?.bookingAttempts ?? 0;
  const totalBookings = stats?.bookings ?? 0;
  const properties = stats?.properties ?? [];
  const updatedAt = stats?.generatedAt
    ? new Date(stats.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const PERIOD_LABELS: Record<Period, string> = {
    '7d': '7 jours',
    '30d': '30 jours',
    '90d': '90 jours',
    '1y': '1 an',
  };

  return (
    <SafeAreaView style={styles.safe}>
      <PageHeader title="Statistiques" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchStats(period, 'pull')}
            tintColor={theme.primary}
          />
        }
      >

        {/* ── Sélecteur de période ─────────────────────────────────────── */}
        <View style={styles.periodRow}>
          {(['7d', '30d', '90d', '1y'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && { ...styles.periodChipActive, backgroundColor: theme.primary, borderColor: theme.primary }]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={PERIOD_LABELS[p]}
              accessibilityState={{ selected: period === p }}
            >
              <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {updatedAt && (
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Mis à jour à {updatedAt} · actualisation automatique</Text>
          </View>
        )}

        {isLoadingStats ? (
          <View style={styles.centeredBlock}>
            <ActivityIndicator size="large" color="#1056E0" />
          </View>
        ) : error && !stats ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* ── Indicateurs clés ─────────────────────────────────────── */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                <KPICard label="Vues" value={formatNumber(totalViews)} iconName="eye-outline" iconColor={theme.primary} />
                <KPICard label="Clics" value={formatNumber(stats?.clicks ?? 0)} iconName="hand-right-outline" iconColor="#6366F1" />
              </View>
              <View style={styles.kpiRow}>
                <KPICard label="Tentatives de réservation" value={formatNumber(totalAttempts)} iconName="cart-outline" iconColor="#F59E0B" />
                <KPICard label="Réservations confirmées" value={formatNumber(totalBookings)} iconName="calendar-outline" iconColor="#0284C7" />
              </View>
              <View style={styles.kpiRow}>
                <KPICard label="Taux de conversion" value={formatPercent(stats?.conversionRate ?? 0)} iconName="trending-up-outline" iconColor="#10B981" />
                <KPICard label="Revenus (FCFA)" value={formatNumber(stats?.revenue ?? 0)} iconName="cash-outline" iconColor="#16A34A" />
              </View>
            </View>

            {/* ── Vues par jour ─────────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Vues par jour (7 derniers jours)</Text>
              {viewsLast7.some(v => v > 0) ? (
                <BarChart data={viewsLast7} labels={labels7} color={theme.primary} height={110} />
              ) : (
                <View style={styles.placeholderChart}>
                  <Ionicons name="bar-chart-outline" size={36} color="#D1D5DB" />
                  <Text style={styles.placeholderText}>Pas encore de vues sur cette période</Text>
                </View>
              )}
            </View>

            {/* ── Tendance des vues sur la période ─────────────────────── */}
            {viewsTrend.length >= 2 && viewsTrend.some(v => v > 0) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Tendance des vues — {PERIOD_LABELS[period]}</Text>
                <LineChart data={viewsTrend} color={theme.primary} height={90} />
              </View>
            )}

            {/* ── Revenus par jour ──────────────────────────────────────── */}
            {revenueLast7.some(v => v > 0) && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Revenus par jour (FCFA)</Text>
                <BarChart data={revenueLast7} labels={labels7} color="#16A34A" height={110} />
              </View>
            )}

            {/* ── Entonnoir de conversion ───────────────────────────────── */}
            {totalViews > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Entonnoir de conversion</Text>
                <FunnelStep label="Vues"                     value={totalViews}    total={totalViews} color={theme.primary} />
                <FunnelStep label="Tentatives de réservation" value={totalAttempts} total={totalViews} color="#F59E0B" />
                <FunnelStep label="Réservations confirmées"  value={totalBookings} total={totalViews} color="#10B981" />
              </View>
            )}

            {/* ── Détail par annonce ───────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Analyse par annonce</Text>

              {properties.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>Aucune donnée par annonce</Text>
                </View>
              ) : (
                properties.map(prop => (
                  <View key={prop.id} style={styles.propCard}>
                    <Text style={styles.propName} numberOfLines={1}>{prop.name}</Text>
                    <View style={styles.propStatsRow}>
                      <View style={styles.propStat}>
                        <Ionicons name="eye-outline" size={13} color="#6B7280" />
                        <Text style={styles.propStatText}>{formatNumber(prop.views)} vues</Text>
                      </View>
                      <View style={styles.propStat}>
                        <Ionicons name="hand-right-outline" size={13} color="#6B7280" />
                        <Text style={styles.propStatText}>{formatNumber(prop.clicks)} clics</Text>
                      </View>
                      <View style={styles.propStat}>
                        <Ionicons name="cart-outline" size={13} color="#6B7280" />
                        <Text style={styles.propStatText}>{formatNumber(prop.bookingAttempts)} tent.</Text>
                      </View>
                    </View>
                    <View style={styles.propStatsRow}>
                      <View style={styles.propStat}>
                        <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                        <Text style={styles.propStatText}>{formatNumber(prop.bookings)} rés. confirmées</Text>
                      </View>
                      <View style={styles.propStat}>
                        <Ionicons name="trending-up-outline" size={13} color="#6B7280" />
                        <Text style={styles.propStatText}>{formatPercent(prop.conversion ?? 0)}</Text>
                      </View>
                      <View style={styles.propStat}>
                        <Ionicons name="cash-outline" size={13} color="#6B7280" />
                        <Text style={styles.propStatText}>{formatNumber(prop.revenue)} FCFA</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centeredBlock: { paddingVertical: 60, alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 80 },

  // Header
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  // Locked
  lockedContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockEmoji: { fontSize: 36 },
  lockedTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  lockedSubtitle: { fontSize: 15, fontWeight: '600', color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  lockedDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  upgradeBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },
  upgradeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Period chips
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  periodChip: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodChipActive: {
    backgroundColor: '#1056E0', // overridden dynamically with theme.primary in JSX
    borderColor: '#1056E0',
  },
  periodChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  periodChipTextActive: { color: '#fff' },

  // KPI grid
  kpiGrid: { gap: 10, marginBottom: 16 },
  kpiRow: { flexDirection: 'row', gap: 10 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },

  // Placeholder chart
  placeholderChart: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    gap: 8,
  },
  placeholderText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  // Indicateur temps réel
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 14 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  liveText: { fontSize: 11, color: '#6B7280' },

  // Section
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  // Empty
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: '#9CA3AF' },

  // Property card
  propCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  propName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  propStatsRow: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  propStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  propStatText: { fontSize: 12, color: '#6B7280' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  priceItem: { flex: 1, alignItems: 'center' },
  priceItemLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 3 },
  priceItemValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  priceItemDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB', marginHorizontal: 10 },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  signalEmoji: { fontSize: 14 },
  signalText: { fontSize: 12, fontWeight: '600', flex: 1 },
  suggestedPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 2,
  },

  // Market card
  marketCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  marketHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  marketTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  marketStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  marketStat: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  marketStatLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  marketStatValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
  },
  insightText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 18 },
});
