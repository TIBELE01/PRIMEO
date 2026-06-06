import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
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
  bookings: number;
  currentPrice: number;
  marketAvgPrice: number;
  suggestedPrice: number;
}

interface DayRevenue {
  date: string;
  revenue: number;
}

interface DetailedStats {
  views: number;
  clicks: number;
  bookings: number;
  ctr: number;
  conversionRate: number;
  properties: PropertyStat[];
  revenueByDay?: DayRevenue[];
}

type Period = '7d' | '30d' | '90d' | '1y';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString('fr-CI');
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

function PriceBar({ current, market }: { current: number; market: number }) {
  const maxVal = Math.max(current, market, 1);
  return (
    <View style={priceBarStyles.wrap}>
      <View style={priceBarStyles.row}>
        <Text style={priceBarStyles.barLabel}>Actuel</Text>
        <View style={priceBarStyles.track}>
          <View
            style={[
              priceBarStyles.fill,
              { width: `${Math.round((current / maxVal) * 100)}%`, backgroundColor: '#1056E0' },
            ]}
          />
        </View>
      </View>
      <View style={priceBarStyles.row}>
        <Text style={priceBarStyles.barLabel}>Marché</Text>
        <View style={priceBarStyles.track}>
          <View
            style={[
              priceBarStyles.fill,
              { width: `${Math.round((market / maxVal) * 100)}%`, backgroundColor: '#6366F1' },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const priceBarStyles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 40, fontSize: 10, color: '#9CA3AF' },
  track: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});

// ─── Locked screen ────────────────────────────────────────────────────────────

function LockedScreen({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.lockedContainer}>
        <View style={styles.lockIconWrap}>
          <Text style={styles.lockEmoji}>🔒</Text>
        </View>
        <Text style={styles.lockedTitle}>Statistiques avancées</Text>
        <Text style={styles.lockedSubtitle}>Disponible à partir du plan Prestige</Text>
        <Text style={styles.lockedDesc}>
          Vues détaillées, taux de clics, conversion, comparaison marché et suggestions de prix
        </Text>
        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade} activeOpacity={0.8}>
          <Ionicons name="arrow-up-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.upgradeBtnText}>Passer à Prestige</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const navigation = useNavigation<any>();
  const theme = useProTheme();

  const [plan, setPlan] = useState<string | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('30d');

  // Fetch plan
  useEffect(() => {
    (async () => {
      try {
        const res = await boostsApi.getBalance();
        const d = res.data?.data ?? res.data;
        setPlan(d?.plan ?? 'Essentiel');
      } catch {
        setPlan('Essentiel');
      } finally {
        setIsLoadingPlan(false);
      }
    })();
  }, []);

  const isLocked =
    plan !== null && (plan.toLowerCase() === 'essential' || plan.toLowerCase() === 'essentiel');

  const fetchStats = useCallback(async (p: Period, silent = false) => {
    if (!silent) setIsLoadingStats(true);
    else setIsRefreshing(true);
    try {
      const res = await analyticsApi.getDetailedStats({ period: p });
      const d = res.data?.data ?? res.data;
      setStats(d as DetailedStats);
    } catch {
      // silently ignore
    } finally {
      setIsLoadingStats(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isLocked && !isLoadingPlan) {
      fetchStats(period);
    }
  }, [isLocked, isLoadingPlan, period, fetchStats]);

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

  // ── Charts data ────────────────────────────────────────────────────────────
  const revenueByDay = stats?.revenueByDay ?? [];
  const chartData = revenueByDay.length > 0
    ? revenueByDay.slice(-7).map(d => d.revenue)
    : (stats?.properties ?? []).reduce((acc: number[], p) => { acc.push(p.views); return acc; }, []).slice(0, 7);
  const chartLabels = revenueByDay.length > 0
    ? revenueByDay.slice(-7).map(d => shortDate(d.date))
    : (stats?.properties ?? []).slice(0, 7).map((_, i) => `P${i + 1}`);
  const hasChartData = chartData.length > 0 && chartData.some(v => v > 0);

  // Revenue trend (all days → line chart)
  const revTrend = revenueByDay.length > 0 ? revenueByDay.map(d => d.revenue) : [];

  // Conversion funnel
  const totalViews = stats?.views ?? 0;
  const totalClicks = stats?.clicks ?? 0;
  const totalBookings = stats?.bookings ?? 0;

  // ── Market intelligence ────────────────────────────────────────────────────
  const properties = stats?.properties ?? [];
  const propertiesWithPrices = properties.filter(p => p.marketAvgPrice > 0 && p.currentPrice > 0);
  const avgCurrentPrice =
    propertiesWithPrices.length > 0
      ? propertiesWithPrices.reduce((s, p) => s + p.currentPrice, 0) / propertiesWithPrices.length
      : 0;
  const avgMarketPrice =
    propertiesWithPrices.length > 0
      ? propertiesWithPrices.reduce((s, p) => s + p.marketAvgPrice, 0) / propertiesWithPrices.length
      : 0;
  const priceDeltaPct =
    avgMarketPrice > 0 ? ((avgCurrentPrice - avgMarketPrice) / avgMarketPrice) * 100 : 0;

  const PERIOD_LABELS: Record<Period, string> = {
    '7d': '7 jours',
    '30d': '30 jours',
    '90d': '90 jours',
    '1y': '1 an',
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchStats(period, true)}
            tintColor={theme.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Statistiques avancées</Text>
          <Text style={styles.subtitle}>Analyse détaillée de vos annonces</Text>
        </View>

        {/* ── Period selector ───────────────────────────────────────────── */}
        <View style={styles.periodRow}>
          {(['7d', '30d', '90d', '1y'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && { ...styles.periodChipActive, backgroundColor: theme.primary, borderColor: theme.primary }]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoadingStats ? (
          <View style={styles.centeredBlock}>
            <ActivityIndicator size="large" color="#1056E0" />
          </View>
        ) : (
          <>
            {/* ── KPI grid 2x2 ─────────────────────────────────────────── */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                <KPICard
                  label="Vues totales"
                  value={formatNumber(stats?.views ?? 0)}
                  iconName="eye-outline"
                  iconColor={theme.primary}
                />
                <KPICard
                  label="Taux de clics"
                  value={formatPercent(stats?.ctr ?? 0)}
                  iconName="stats-chart-outline"
                  iconColor="#6366F1"
                />
              </View>
              <View style={styles.kpiRow}>
                <KPICard
                  label="Taux de conversion"
                  value={formatPercent(stats?.conversionRate ?? 0)}
                  iconName="trending-up-outline"
                  iconColor="#F59E0B"
                />
                <KPICard
                  label="Réservations"
                  value={formatNumber(stats?.bookings ?? 0)}
                  iconName="calendar-outline"
                  iconColor="#0284C7"
                />
              </View>
            </View>

            {/* ── Bar chart — revenus par jour / vues ───────────────────── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {revenueByDay.length > 0 ? 'Revenus par jour (FCFA)' : 'Vues par annonce'}
              </Text>
              {hasChartData ? (
                <BarChart data={chartData} labels={chartLabels} color={theme.primary} height={110} />
              ) : (
                <View style={styles.placeholderChart}>
                  <Ionicons name="bar-chart-outline" size={36} color="#D1D5DB" />
                  <Text style={styles.placeholderText}>Pas encore de données pour cette période</Text>
                </View>
              )}
            </View>

            {/* ── Line chart — tendance revenus ─────────────────────────── */}
            {revTrend.length >= 2 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Tendance des revenus</Text>
                <LineChart data={revTrend} color={theme.primary} height={90} />
              </View>
            )}

            {/* ── Conversion funnel ─────────────────────────────────────── */}
            {totalViews > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Entonnoir de conversion</Text>
                <FunnelStep label="Vues"         value={totalViews}   total={totalViews}   color={theme.primary} />
                <FunnelStep label="Clics"        value={totalClicks}  total={totalViews}   color="#6366F1" />
                <FunnelStep label="Réservations" value={totalBookings} total={totalViews}  color="#10B981" />
              </View>
            )}

            {/* ── Per-property analysis ──────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Analyse par annonce</Text>

              {properties.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>Aucune donnée par annonce</Text>
                </View>
              ) : (
                properties.map(prop => {
                  const ratio = prop.marketAvgPrice > 0 ? prop.currentPrice / prop.marketAvgPrice : 1;
                  const isUnder = ratio < 0.8;
                  const isOver = ratio > 1.2;
                  const hasSuggestion =
                    prop.suggestedPrice > 0 && prop.suggestedPrice !== prop.currentPrice;

                  return (
                    <View key={prop.id} style={styles.propCard}>
                      <Text style={styles.propName} numberOfLines={1}>{prop.name}</Text>

                      {/* Views + clicks */}
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
                          <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                          <Text style={styles.propStatText}>{prop.bookings} rés.</Text>
                        </View>
                      </View>

                      {/* Price comparison */}
                      {prop.currentPrice > 0 && (
                        <>
                          <View style={styles.priceRow}>
                            <View style={styles.priceItem}>
                              <Text style={styles.priceItemLabel}>Prix actuel</Text>
                              <Text style={styles.priceItemValue}>
                                {formatNumber(prop.currentPrice)} FCFA
                              </Text>
                            </View>
                            <View style={styles.priceItemDivider} />
                            <View style={styles.priceItem}>
                              <Text style={styles.priceItemLabel}>Prix marché</Text>
                              <Text style={[styles.priceItemValue, { color: '#6366F1' }]}>
                                {formatNumber(prop.marketAvgPrice)} FCFA
                              </Text>
                            </View>
                          </View>

                          {/* Valuation signal */}
                          {isUnder && (
                            <View style={styles.signalRow}>
                              <Text style={styles.signalEmoji}>📉</Text>
                              <Text style={[styles.signalText, { color: '#DC2626' }]}>
                                Sous-évalué — votre prix est nettement en dessous du marché
                              </Text>
                            </View>
                          )}
                          {isOver && (
                            <View style={styles.signalRow}>
                              <Text style={styles.signalEmoji}>📈</Text>
                              <Text style={[styles.signalText, { color: '#F59E0B' }]}>
                                Sur-évalué — votre prix dépasse significativement le marché
                              </Text>
                            </View>
                          )}

                          {/* Suggested price */}
                          {hasSuggestion && (
                            <Text style={styles.suggestedPrice}>
                              Prix suggéré : {formatNumber(prop.suggestedPrice)} FCFA
                            </Text>
                          )}

                          {/* Mini price bars */}
                          <PriceBar current={prop.currentPrice} market={prop.marketAvgPrice} />
                        </>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* ── Market intelligence ────────────────────────────────────── */}
            {avgMarketPrice > 0 && (
              <View style={styles.marketCard}>
                <View style={styles.marketHeader}>
                  <Ionicons name="globe-outline" size={18} color="#6366F1" />
                  <Text style={styles.marketTitle}>Marché</Text>
                </View>
                <View style={styles.marketStatsRow}>
                  <View style={styles.marketStat}>
                    <Text style={styles.marketStatLabel}>Prix moyen du marché</Text>
                    <Text style={styles.marketStatValue}>{formatNumber(Math.round(avgMarketPrice))} FCFA</Text>
                  </View>
                  <View style={styles.marketStat}>
                    <Text style={styles.marketStatLabel}>Votre prix moyen</Text>
                    <Text style={styles.marketStatValue}>{formatNumber(Math.round(avgCurrentPrice))} FCFA</Text>
                  </View>
                </View>
                <View style={styles.insightRow}>
                  <Ionicons
                    name={priceDeltaPct >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
                    size={14}
                    color={priceDeltaPct >= 0 ? '#F59E0B' : '#1056E0'}
                  />
                  <Text style={styles.insightText}>
                    Votre prix moyen est{' '}
                    <Text style={{ fontWeight: '700', color: priceDeltaPct >= 0 ? '#F59E0B' : '#6366F1' }}>
                      {Math.abs(priceDeltaPct).toFixed(1)}%{' '}
                      {priceDeltaPct >= 0 ? 'au-dessus' : 'en dessous'}
                    </Text>{' '}
                    du marché
                  </Text>
                </View>
              </View>
            )}
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
  scroll: { padding: 16, paddingBottom: 48 },

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
