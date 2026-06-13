import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KPICard } from '../../../components/dashboard/KPICard';
import { AlertCard } from '../../../components/dashboard/AlertCard';
import { proDashboardApi } from '../../../services/api/endpoints/proDashboard';
import { useProTheme } from '../../../hooks/useProTheme';
import { useAuthStore } from '../../../store/authStore';
import { useSubscription } from '../../../hooks/useSubscription';

const { width } = Dimensions.get('window');

// ─── Mini charts (pure RN) ────────────────────────────────────────────────────

function BarChart({ data, labels, color, height = 100 }: {
  data: number[]; labels: string[]; color: string; height?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: height + 20 }}>
      {data.map((val, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{
            width: '75%',
            height: Math.max(Math.round((val / max) * height), 2),
            backgroundColor: color,
            borderRadius: 3,
            opacity: i === data.length - 1 ? 1 : 0.65,
          }} />
          <Text style={{ fontSize: 8, color: '#9CA3AF', marginTop: 3 }}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

function LineChart({ data, color, height = 80 }: {
  data: number[]; color: string; height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = (width - 80) / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * w,
    y: height - ((v - min) / range) * (height - 8),
  }));

  return (
    <View style={{ height: height + 4, overflow: 'hidden' }}>
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        // Position at midpoint so default center-origin rotation is correct
        const midX = (p.x + next.x) / 2;
        const midY = (p.y + next.y) / 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: midX - len / 2,
              top: midY - 1,
              width: len,
              height: 2,
              backgroundColor: color,
              opacity: 0.85,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}
      {points.map((p, i) => (
        <View key={`dot-${i}`} style={{
          position: 'absolute',
          left: p.x - 3,
          top: p.y - 3,
          width: 6, height: 6,
          borderRadius: 3,
          backgroundColor: color,
        }} />
      ))}
    </View>
  );
}

function DonutChart({ value, max, color, size = 72 }: {
  value: number; max: number; color: string; size?: number;
}) {
  const pct = Math.min(value / Math.max(max, 1), 1);
  const pctDisplay = Math.round(pct * 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 8, borderColor: '#E5E7EB',
        position: 'absolute',
      }} />
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 8,
        borderColor: color,
        borderTopColor: pct > 0.75 ? color : 'transparent',
        borderRightColor: pct > 0.5 ? color : 'transparent',
        borderBottomColor: pct > 0.25 ? color : 'transparent',
        borderLeftColor: color,
        position: 'absolute',
        transform: [{ rotate: `${pct * 360 - 90}deg` }],
      }} />
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827' }}>{pctDisplay}%</Text>
    </View>
  );
}

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const DAY_LABELS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

// Couleurs par formule pour la bannière abonnement
const PLAN_COLORS: Record<string, string> = {
  starter:    '#6B7280',
  business:   '#1056E0',
  entreprise: '#7C3AED',
};

export default function DashboardScreen({ navigation }: any) {
  const theme = useProTheme();
  const user = useAuthStore((s) => s.user);
  const { subscription } = useSubscription();
  const [stats, setStats] = useState<any>(null);
  const [propStats, setPropStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const [bRes, pRes] = await Promise.allSettled([
        proDashboardApi.getBookingStats(),
        proDashboardApi.getPropertyStats(),
      ]);
      if (bRes.status === 'fulfilled') {
        const d = bRes.value.data?.data ?? bRes.value.data;
        setStats(d);
      }
      if (pRes.status === 'fulfilled') {
        const d = pRes.value.data?.data ?? pRes.value.data;
        setPropStats(d);
      }
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();

  // Revenue — 6 months
  const revenueLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return MONTH_LABELS[d.getMonth()];
  });
  const revenueData: number[] = stats?.revenueByMonth?.slice(-6) ?? Array(6).fill(0);

  // Occupancy — 7 days
  const occupancyData: number[] = stats?.occupancyByDay?.slice(-7) ?? Array(7).fill(0);
  const occLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return DAY_LABELS[d.getDay()];
  });

  // Revenue trend (line chart) — last 12 months
  const revTrendData: number[] = stats?.revenueByMonth?.slice(-12) ?? Array(12).fill(0);

  // KPIs
  const pendingCount       = stats?.pending ?? 0;
  const upcomingCount      = stats?.upcoming ?? 0;
  const completedCount     = stats?.completed ?? 0;
  const cancelledCount     = stats?.cancelled ?? 0;
  const occupancyRate      = stats?.occupancyRate30d ?? propStats?.occupancyRate ?? 0;
  const netRevenue         = stats?.netRevenueMois ?? stats?.netRevenue ?? 0;
  const avgRating          = propStats?.averageRating ?? stats?.averageRating ?? 0;
  const subscriptionDaysLeft = stats?.subscriptionDaysLeft ?? propStats?.subscriptionDaysLeft ?? 99;
  const listingsToUpdate   = Math.max(0, (propStats?.total ?? 0) - (propStats?.published ?? 0));
  const totalProperties    = propStats?.total ?? 0;
  const publishedProperties = propStats?.published ?? 0;
  const totalViews         = stats?.totalViews ?? propStats?.totalViews ?? 0;
  const conversionRate     = stats?.conversionRate ?? 0;

  // Quick stat bar
  const quickStats = [
    { label: 'En attente', value: pendingCount, color: '#F59E0B' },
    { label: 'À venir',    value: upcomingCount, color: theme.primary },
    { label: 'Terminées',  value: completedCount, color: '#10B981' },
    { label: 'Annulées',   value: cancelledCount, color: '#EF4444' },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: '#F8FAFC' }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.primary }]}>Chargement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const firstName = user?.firstName ?? 'Pro';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <View>
            <Text style={styles.headerGreeting}>Bonjour, {firstName} 👋</Text>
            <Text style={styles.headerSub}>Voici votre tableau de bord</Text>
          </View>
          <TouchableOpacity onPress={() => load(true)} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Alerts */}
          {(pendingCount > 0 || subscriptionDaysLeft < 30 || listingsToUpdate > 0) && (
            <View style={styles.section}>
              {pendingCount > 0 && (
                <AlertCard
                  type="booking_request"
                  message={`${pendingCount} réservation${pendingCount > 1 ? 's' : ''} en attente de confirmation`}
                  actionLabel="Voir"
                  onAction={() => navigation.navigate('Bookings')}
                />
              )}
              {subscriptionDaysLeft < 30 && (
                <AlertCard
                  type="boost_expiring"
                  message={`Abonnement expire dans ${subscriptionDaysLeft} jour${subscriptionDaysLeft !== 1 ? 's' : ''}`}
                  actionLabel="Renouveler"
                  onAction={() => navigation.navigate('Subscriptions')}
                />
              )}
              {listingsToUpdate > 0 && (
                <AlertCard
                  type="listing_update"
                  message={`${listingsToUpdate} annonce${listingsToUpdate > 1 ? 's' : ''} à compléter`}
                  actionLabel="Gérer"
                  onAction={() => navigation.navigate('PropertiesList')}
                />
              )}
            </View>
          )}

          {/* Bannière abonnement */}
          {subscription && (
            <TouchableOpacity
              style={[styles.subBanner, { borderLeftColor: PLAN_COLORS[subscription.planType] ?? theme.primary }]}
              onPress={() => navigation.navigate('Subscriptions')}
              activeOpacity={0.85}
            >
              <View style={styles.subBannerLeft}>
                <View style={[styles.subBadge, { backgroundColor: PLAN_COLORS[subscription.planType] ?? theme.primary }]}>
                  <Text style={styles.subBadgeText}>{subscription.planName}</Text>
                </View>
                <Text style={styles.subBannerTitle}>Votre formule</Text>
              </View>
              <View style={styles.subBannerRight}>
                <Text style={styles.subBannerStat}>
                  <Text style={{ fontWeight: '800', color: PLAN_COLORS[subscription.planType] ?? theme.primary }}>
                    {publishedProperties}
                  </Text>
                  <Text style={{ color: '#6B7280' }}>
                    /{subscription.includedPropertiesLimit >= 9999 ? '∞' : subscription.includedPropertiesLimit} annonces
                  </Text>
                </Text>
                <Text style={styles.subBannerStat}>
                  <Text style={{ fontWeight: '800', color: '#10B981' }}>
                    {subscription.freeBoostsRemaining}
                  </Text>
                  <Text style={{ color: '#6B7280' }}> boost{subscription.freeBoostsRemaining !== 1 ? 's' : ''} gratuit{subscription.freeBoostsRemaining !== 1 ? 's' : ''}</Text>
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Booking status strip */}
          <View style={styles.statusStrip}>
            {quickStats.map((s) => (
              <View key={s.label} style={styles.statusItem}>
                <Text style={[styles.statusValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statusLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Revenue card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Revenus nets — mois en cours</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
                <Text style={[styles.cardLink, { color: theme.primary }]}>Tout voir →</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.bigNumber, { color: theme.primary }]}>
              {netRevenue.toLocaleString('fr-CI')} FCFA
            </Text>
            <View style={styles.chartLabel}>
              <Text style={styles.chartTitle}>Revenus 6 derniers mois</Text>
            </View>
            <BarChart data={revenueData} labels={revenueLabels} color={theme.primary} height={100} />
          </View>

          {/* Revenue trend (line) */}
          {revTrendData.some((v) => v > 0) && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Tendance revenus (12 mois)</Text>
              </View>
              <LineChart data={revTrendData} color={theme.primary} height={80} />
            </View>
          )}

          {/* Occupancy + Rating row */}
          <View style={styles.row}>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Taux d'occupation</Text>
              <Text style={styles.cardSubtitle}>30 derniers jours</Text>
              <View style={styles.donutRow}>
                <DonutChart value={occupancyRate} max={100} color={theme.primary} size={72} />
                <View style={styles.donutInfo}>
                  <Text style={[styles.bigNumber, { color: theme.primary, fontSize: 22 }]}>{Math.round(occupancyRate)}%</Text>
                  <Text style={styles.trendText}>
                    {occupancyRate >= 70 ? '🔥 Excellent' : occupancyRate >= 40 ? '👍 Bon' : '📉 À améliorer'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Note moyenne</Text>
              <Text style={styles.cardSubtitle}>Tous avis</Text>
              <View style={styles.ratingBox}>
                <Text style={[styles.bigNumber, { fontSize: 32, color: '#F59E0B' }]}>
                  {avgRating ? avgRating.toFixed(1) : '—'}
                </Text>
                <Text style={{ fontSize: 20 }}>⭐</Text>
              </View>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons
                    key={n}
                    name={n <= Math.round(avgRating) ? 'star' : 'star-outline'}
                    size={14}
                    color="#F59E0B"
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Occupancy bar chart */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Taux d'occupation — 7 derniers jours</Text>
            <BarChart data={occupancyData} labels={occLabels} color="#0284C7" height={80} />
          </View>

          {/* Properties + Views row */}
          <View style={styles.row}>
            <View style={[styles.card, { flex: 1 }]}>
              <Ionicons name="business" size={22} color={theme.primary} style={{ marginBottom: 6 }} />
              <Text style={[styles.bigNumber, { color: theme.primary }]}>{publishedProperties}</Text>
              <Text style={styles.cardSubtitle}>Annonces actives</Text>
              <Text style={styles.trendText}>{totalProperties} au total</Text>
            </View>

            <View style={[styles.card, { flex: 1 }]}>
              <Ionicons name="eye" size={22} color="#6366F1" style={{ marginBottom: 6 }} />
              <Text style={[styles.bigNumber, { color: '#6366F1' }]}>{totalViews.toLocaleString('fr-CI')}</Text>
              <Text style={styles.cardSubtitle}>Vues ce mois</Text>
              {conversionRate > 0 && (
                <Text style={styles.trendText}>Conversion : {conversionRate.toFixed(1)}%</Text>
              )}
            </View>
          </View>

          {/* Quick actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            <View style={styles.quickGrid}>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('PropertiesList')}>
                <Ionicons name="business-outline" size={24} color={theme.primary} />
                <Text style={styles.quickLabel}>Annonces</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Bookings')}>
                <Ionicons name="calendar-outline" size={24} color={theme.primary} />
                <Text style={styles.quickLabel}>Réservations</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Analytics')}>
                <Ionicons name="bar-chart-outline" size={24} color={theme.primary} />
                <Text style={styles.quickLabel}>Statistiques</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('PropertyCalendar')}>
                <Ionicons name="today-outline" size={24} color={theme.primary} />
                <Text style={styles.quickLabel}>Calendrier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ReceivedReviews')}>
                <Ionicons name="star-outline" size={24} color={theme.primary} />
                <Text style={styles.quickLabel}>Avis</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Subscriptions')}>
                <Ionicons name="card-outline" size={24} color={theme.primary} />
                <Text style={styles.quickLabel}>Abonnement</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Payouts')}>
                <Ionicons name="cash-outline" size={24} color={theme.primary} />
                <Text style={styles.quickLabel}>Reversements</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ExtraSlots')}>
                <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
                <Text style={styles.quickLabel}>Publications +</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerGreeting: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  refreshBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },

  body: { padding: 16, gap: 12 },

  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },

  statusStrip: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  statusItem: { flex: 1, alignItems: 'center' },
  statusValue: { fontSize: 22, fontWeight: '800' },
  statusLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontWeight: '600' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  cardSubtitle: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  cardLink: { fontSize: 12, fontWeight: '600' },
  chartLabel: { marginTop: 4, marginBottom: 8 },
  chartTitle: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  bigNumber: { fontSize: 28, fontWeight: '900', color: '#111827', marginVertical: 4 },

  row: { flexDirection: 'row', gap: 12 },

  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  donutInfo: { flex: 1 },
  trendText: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  ratingBox: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 8 },
  ratingStars: { flexDirection: 'row', gap: 2, marginTop: 4 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn: {
    width: (width - 32 - 20) / 3,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 6,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  quickLabel: { fontSize: 11, color: '#374151', fontWeight: '600', textAlign: 'center' },

  subBanner: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderLeftWidth: 4,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  subBannerLeft: { flex: 1, gap: 4 },
  subBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  subBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
  subBannerTitle: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  subBannerRight: { alignItems: 'flex-end', gap: 2 },
  subBannerStat: { fontSize: 13 },
});
