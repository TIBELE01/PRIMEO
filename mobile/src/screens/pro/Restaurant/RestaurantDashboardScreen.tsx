import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { proDashboardApi } from '../../../services/api/endpoints/proDashboard';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { useProTheme } from '../../../hooks/useProTheme';
import { useAuthStore } from '../../../store/authStore';

const { width } = Dimensions.get('window');
const PRIMARY = '#DC2626';

// ─── Mini-graphiques (pure RN) ────────────────────────────────────────────────

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

function DonutChart({ value, max, color, size = 72 }: {
  value: number; max: number; color: string; size?: number;
}) {
  const pct = Math.min(value / Math.max(max, 1), 1);
  const pctDisplay = Math.round(pct * 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 8, borderColor: '#E5E7EB', position: 'absolute',
      }} />
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 8, borderColor: color,
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
const DAY_LABELS   = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function RestaurantDashboardScreen({ navigation }: any) {
  const theme = useProTheme();
  const user  = useAuthStore((s) => s.user);

  const [stats,        setStats]        = useState<any>(null);
  const [propStats,    setPropStats]    = useState<any>(null);
  const [propertyName, setPropertyName] = useState('Mon restaurant');
  const [noProperty,   setNoProperty]   = useState(false);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      // Nom du restaurant
      const propRes = await propertiesApi.getMyListings().catch(() => null);
      const listings: any[] = propRes?.data?.data ?? propRes?.data ?? [];
      if (listings.length > 0) {
        setPropertyName(listings[0].title ?? listings[0].name ?? 'Mon restaurant');
        setNoProperty(false);
      } else {
        setNoProperty(true);
      }

      const [bRes, pRes] = await Promise.allSettled([
        proDashboardApi.getBookingStats(),
        proDashboardApi.getPropertyStats(),
      ]);
      if (bRes.status === 'fulfilled') {
        setStats(bRes.value.data?.data ?? bRes.value.data);
      }
      if (pRes.status === 'fulfilled') {
        setPropStats(pRes.value.data?.data ?? pRes.value.data);
      }
    } catch {
      // erreur silencieuse
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={[styles.loadingText, { color: PRIMARY }]}>Chargement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Onboarding : aucun restaurant
  if (noProperty) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <View style={[styles.onboardIcon, { backgroundColor: PRIMARY + '18' }]}>
            <Ionicons name="restaurant" size={48} color={PRIMARY} />
          </View>
          <Text style={styles.onboardTitle}>Bienvenue sur Primeo !</Text>
          <Text style={styles.onboardSub}>
            Créez votre fiche restaurant pour gérer vos réservations, votre menu et vos créneaux.
          </Text>
          <TouchableOpacity
            style={[styles.onboardBtn, { backgroundColor: PRIMARY }]}
            onPress={() => navigation.navigate('AddProperty', { initialType: 'restaurant' })}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.onboardBtnText}>Créer mon restaurant</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const now = new Date();

  // Revenus — 6 mois
  const revenueLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return MONTH_LABELS[d.getMonth()];
  });
  const revenueData: number[] = stats?.revenueByMonth?.slice(-6) ?? Array(6).fill(0);

  // Taux d'occupation — 7 jours
  const occupancyData: number[] = stats?.occupancyByDay?.slice(-7) ?? Array(7).fill(0);
  const occLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return DAY_LABELS[d.getDay()];
  });

  // KPIs
  const pendingCount    = stats?.pending    ?? 0;
  const upcomingCount   = stats?.upcoming   ?? 0;
  const completedCount  = stats?.completed  ?? 0;
  const cancelledCount  = stats?.cancelled  ?? 0;
  const occupancyRate   = stats?.occupancyRate30d ?? propStats?.occupancyRate ?? 0;
  const netRevenue      = stats?.netRevenueMois   ?? stats?.netRevenue ?? 0;
  const avgRating       = propStats?.averageRating ?? stats?.averageRating ?? 0;
  const publishedProps  = propStats?.published ?? 0;
  const totalProps      = propStats?.total    ?? 0;
  const totalViews      = stats?.totalViews   ?? propStats?.totalViews ?? 0;
  const convRate        = stats?.conversionRate ?? 0;

  const firstName = user?.firstName ?? 'Pro';

  // Barre statuts
  const quickStats = [
    { label: 'En attente',  value: pendingCount,   color: '#F59E0B' },
    { label: 'À venir',     value: upcomingCount,  color: PRIMARY },
    { label: 'Terminées',   value: completedCount,  color: '#10B981' },
    { label: 'Annulées',    value: cancelledCount,  color: '#EF4444' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor={PRIMARY} />
        }
      >
        {/* ── En-tête coloré ──────────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: PRIMARY }]}>
          <View>
            <Text style={styles.headerGreeting}>Bonjour, {firstName} 👋</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{propertyName}</Text>
          </View>
          <TouchableOpacity onPress={() => load(true)} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>

          {/* ── Barre statuts réservations ───────────────────────────────── */}
          <View style={styles.statusStrip}>
            {quickStats.map((s) => (
              <View key={s.label} style={styles.statusItem}>
                <Text style={[styles.statusValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statusLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Revenus nets (bar chart 6 mois) ─────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Revenus nets — mois en cours</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
                <Text style={[styles.cardLink, { color: PRIMARY }]}>Tout voir →</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.bigNumber, { color: PRIMARY }]}>
              {netRevenue.toLocaleString('fr-CI')} FCFA
            </Text>
            <View style={styles.chartLabel}>
              <Text style={styles.chartTitle}>Revenus 6 derniers mois</Text>
            </View>
            <BarChart data={revenueData} labels={revenueLabels} color={PRIMARY} height={100} />
          </View>

          {/* ── Taux d'occupation + Note moyenne ────────────────────────── */}
          <View style={styles.row}>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardTitle}>Taux d'occupation</Text>
              <Text style={styles.cardSubtitle}>30 derniers jours</Text>
              <View style={styles.donutRow}>
                <DonutChart value={occupancyRate} max={100} color={PRIMARY} size={72} />
                <View style={styles.donutInfo}>
                  <Text style={[styles.bigNumber, { color: PRIMARY, fontSize: 22 }]}>
                    {Math.round(occupancyRate)}%
                  </Text>
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

          {/* ── Taux d'occupation — 7 derniers jours ────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Taux d'occupation — 7 derniers jours</Text>
            <BarChart data={occupancyData} labels={occLabels} color="#0284C7" height={80} />
          </View>

          {/* ── Annonces actives / Vues ce mois ─────────────────────────── */}
          <View style={styles.row}>
            <View style={[styles.card, { flex: 1 }]}>
              <Ionicons name="restaurant" size={22} color={PRIMARY} style={{ marginBottom: 6 }} />
              <Text style={[styles.bigNumber, { color: PRIMARY }]}>{publishedProps}</Text>
              <Text style={styles.cardSubtitle}>Annonces actives</Text>
              <Text style={styles.trendText}>{totalProps} au total</Text>
            </View>

            <View style={[styles.card, { flex: 1 }]}>
              <Ionicons name="eye" size={22} color="#6366F1" style={{ marginBottom: 6 }} />
              <Text style={[styles.bigNumber, { color: '#6366F1' }]}>
                {totalViews.toLocaleString('fr-CI')}
              </Text>
              <Text style={styles.cardSubtitle}>Vues ce mois</Text>
              {convRate > 0 && (
                <Text style={styles.trendText}>Conversion : {convRate.toFixed(1)}%</Text>
              )}
            </View>
          </View>

          {/* ── Actions rapides ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            <View style={styles.quickGrid}>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('MenuManagement')}>
                <Ionicons name="restaurant-outline" size={24} color={PRIMARY} />
                <Text style={styles.quickLabel}>Menu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Bookings')}>
                <Ionicons name="calendar-outline" size={24} color={PRIMARY} />
                <Text style={styles.quickLabel}>Réservations</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('TimeSlots')}>
                <Ionicons name="time-outline" size={24} color={PRIMARY} />
                <Text style={styles.quickLabel}>Créneaux</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Promotions')}>
                <Ionicons name="pricetag-outline" size={24} color={PRIMARY} />
                <Text style={styles.quickLabel}>Promotions</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('FoodOrders')}>
                <Ionicons name="receipt-outline" size={24} color={PRIMARY} />
                <Text style={styles.quickLabel}>Commandes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Analytics')}>
                <Ionicons name="bar-chart-outline" size={24} color={PRIMARY} />
                <Text style={styles.quickLabel}>Statistiques</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Boosts')}>
                <Ionicons name="flash-outline" size={24} color={PRIMARY} />
                <Text style={styles.quickLabel}>Boosts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ReceivedReviews')}>
                <Ionicons name="star-outline" size={24} color={PRIMARY} />
                <Text style={styles.quickLabel}>Avis reçus</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Payouts')}>
                <Ionicons name="cash-outline" size={24} color={PRIMARY} />
                <Text style={styles.quickLabel}>Reversements</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('ExtraSlots')}>
                <Ionicons name="add-circle-outline" size={24} color={PRIMARY} />
                <Text style={styles.quickLabel}>Menus +</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F8FAFC' },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  loadingText: { fontSize: 14, fontWeight: '600' },

  // Onboarding
  onboardIcon:    { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  onboardTitle:   { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  onboardSub:     { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  onboardBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  onboardBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Header coloré
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerGreeting: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:      { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  refreshBtn:     { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },

  body: { padding: 16, gap: 12 },

  section:      { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Barre statuts
  statusStrip: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  statusItem:  { flex: 1, alignItems: 'center' },
  statusValue: { fontSize: 22, fontWeight: '800' },
  statusLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontWeight: '600' },

  // Carte générique
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle:   { fontSize: 13, fontWeight: '700', color: '#374151' },
  cardSubtitle:{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  cardLink:    { fontSize: 12, fontWeight: '600' },
  chartLabel:  { marginTop: 4, marginBottom: 8 },
  chartTitle:  { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  bigNumber: { fontSize: 28, fontWeight: '900', color: '#111827', marginVertical: 4 },

  row:      { flexDirection: 'row', gap: 12 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  donutInfo:{ flex: 1 },
  trendText:{ fontSize: 11, color: '#6B7280', marginTop: 2 },

  ratingBox:  { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 8 },
  ratingStars:{ flexDirection: 'row', gap: 2, marginTop: 4 },

  // Grille actions rapides
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn:  {
    width: (width - 32 - 20) / 3,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 6,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  quickLabel: { fontSize: 11, color: '#374151', fontWeight: '600', textAlign: 'center' },
});
