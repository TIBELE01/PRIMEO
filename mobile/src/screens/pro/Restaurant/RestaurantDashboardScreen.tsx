import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { bookingsApi } from '../../../services/api/endpoints/bookings';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { reviewsApi } from '../../../services/api/endpoints/reviews';
import { useProTheme } from '../../../hooks/useProTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RestaurantBooking {
  id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  startDate: string;
  guests: number;
  specialRequests?: string;
  property: { id: string; name: string };
  client: { firstName: string; lastName: string };
  createdAt: string;
  timeSlot?: string;
  cancellationReason?: string;
  cancelledAt?: string;
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer?: { firstName?: string; lastName?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function inNextNDays(isoDate: string, n: number): boolean {
  const target = new Date(isoDate);
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + n);
  return target >= now && target <= future;
}

function inLastNDays(isoDate: string, n: number): boolean {
  const target = new Date(isoDate);
  const now = new Date();
  const past = new Date();
  past.setDate(now.getDate() - n);
  return target >= past && target <= now;
}

function sameMonth(isoDate: string): boolean {
  const d = new Date(isoDate);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function formatShortDate(isoDate: string): string {
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function formatFullDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderStars(rating: number): string {
  return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPIProps {
  title: string;
  value: number | string;
  accent?: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function KPICard({ title, value, accent = '#1056E0', icon }: KPIProps) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: accent }]}>
      <Ionicons name={icon} size={20} color={accent} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiTitle}>{title}</Text>
    </View>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

interface AlertCardProps {
  type: 'warning' | 'danger';
  booking: RestaurantBooking;
}

function AlertBookingCard({ type, booking }: AlertCardProps) {
  const bg = type === 'warning' ? '#FEF3C7' : '#FEE2E2';
  const border = type === 'warning' ? '#F59E0B' : '#DC2626';
  const textColor = type === 'warning' ? '#92400E' : '#991B1B';
  return (
    <View style={[styles.alertCard, { backgroundColor: bg, borderLeftColor: border }]}>
      <View style={styles.alertHeader}>
        <Ionicons
          name={type === 'warning' ? 'time-outline' : 'close-circle-outline'}
          size={16}
          color={border}
        />
        <Text style={[styles.alertClientName, { color: textColor }]}>
          {booking.client.firstName} {booking.client.lastName}
        </Text>
        <Text style={[styles.alertDate, { color: textColor }]}>
          {formatShortDate(booking.startDate)}
        </Text>
      </View>
      <View style={styles.alertMeta}>
        <Text style={[styles.alertMetaText, { color: textColor }]}>
          {booking.guests} couvert{booking.guests > 1 ? 's' : ''}
          {booking.timeSlot ? `  •  ${booking.timeSlot}` : ''}
        </Text>
      </View>
    </View>
  );
}

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────

interface SlotBarProps {
  slot: string;
  count: number;
  maxCount: number;
}

function SlotBar({ slot, count, maxCount, color }: SlotBarProps & { color?: string }) {
  const pct = maxCount > 0 ? count / maxCount : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{slot}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { flex: pct, backgroundColor: color ?? '#1056E0' }]} />
        <View style={{ flex: 1 - pct }} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RestaurantDashboardScreen() {
  const navigation = useNavigation<any>();
  const theme = useProTheme();

  const [pending, setPending] = useState<RestaurantBooking[]>([]);
  const [confirmed, setConfirmed] = useState<RestaurantBooking[]>([]);
  const [completed, setCompleted] = useState<RestaurantBooking[]>([]);
  const [cancelled, setCancelled] = useState<RestaurantBooking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // Step 1: get propertyId
      let propertyId: string | null = null;
      try {
        const propRes = await propertiesApi.getMyListings();
        const listings = propRes.data?.data ?? propRes.data ?? [];
        if (Array.isArray(listings) && listings.length > 0) {
          propertyId = listings[0].id as string;
        }
      } catch { /* no property */ }

      // Step 2: fetch all in parallel
      const [pendingRes, confirmedRes, completedRes, cancelledRes, reviewsRes] =
        await Promise.allSettled([
          bookingsApi.getMyBookings({ role: 'host', status: 'pending', limit: 100 }),
          bookingsApi.getMyBookings({ role: 'host', status: 'confirmed', limit: 100 }),
          bookingsApi.getMyBookings({ role: 'host', status: 'completed', limit: 100 }),
          bookingsApi.getMyBookings({ role: 'host', status: 'cancelled', limit: 100 }),
          propertyId
            ? reviewsApi.getForProperty(propertyId, { limit: 5 })
            : Promise.reject(new Error('no property')),
        ]);

      if (pendingRes.status === 'fulfilled') {
        const d = pendingRes.value.data?.data ?? pendingRes.value.data ?? [];
        setPending(Array.isArray(d) ? d : []);
      }
      if (confirmedRes.status === 'fulfilled') {
        const d = confirmedRes.value.data?.data ?? confirmedRes.value.data ?? [];
        setConfirmed(Array.isArray(d) ? d : []);
      }
      if (completedRes.status === 'fulfilled') {
        const d = completedRes.value.data?.data ?? completedRes.value.data ?? [];
        setCompleted(Array.isArray(d) ? d : []);
      }
      if (cancelledRes.status === 'fulfilled') {
        const d = cancelledRes.value.data?.data ?? cancelledRes.value.data ?? [];
        setCancelled(Array.isArray(d) ? d : []);
      }
      if (reviewsRes.status === 'fulfilled') {
        const d = reviewsRes.value.data?.data ?? reviewsRes.value.data ?? [];
        setReviews(Array.isArray(d) ? d : []);
      }
    } catch { /* silently ignore top-level errors */ } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── KPI calculations ──────────────────────────────────────────────────────
  const today = todayStr();
  const tomorrow = tomorrowStr();

  const countToday = confirmed.filter(b => b.startDate?.split('T')[0] === today).length;
  const countWeek = confirmed.filter(b => inNextNDays(b.startDate, 7)).length;
  const countMonth = confirmed.filter(b => sameMonth(b.startDate)).length;
  const countPending = pending.length;

  // ── Alerts ────────────────────────────────────────────────────────────────
  const lastMinute = confirmed.filter(b => {
    const d = b.startDate?.split('T')[0];
    return d === today || d === tomorrow;
  });

  const recentCancellations = cancelled.filter(b =>
    b.cancelledAt
      ? inLastNDays(b.cancelledAt, 7)
      : b.createdAt
      ? inLastNDays(b.createdAt, 7)
      : false,
  );

  // ── Occupancy by time slot ────────────────────────────────────────────────
  const slotMap: Record<string, number> = {};
  [...confirmed, ...completed].forEach(b => {
    if (b.timeSlot) {
      slotMap[b.timeSlot] = (slotMap[b.timeSlot] ?? 0) + 1;
    }
  });
  const slotEntries = Object.entries(slotMap).sort((a, b) => b[1] - a[1]);
  const maxSlotCount = slotEntries.length > 0 ? slotEntries[0][1] : 1;

  // ── Recent reviews ────────────────────────────────────────────────────────
  const recentReviews = reviews.slice(0, 3);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Chargement du tableau de bord…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load(true)}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <Text style={[styles.title, { color: '#fff' }]}>Tableau de bord</Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>Votre espace restaurant professionnel</Text>
        </View>

        {/* KPI grid 2×2 */}
        <View style={styles.kpiGrid}>
          <KPICard title="Aujourd'hui" value={countToday} icon="today-outline" accent={theme.primary} />
          <KPICard title="Cette semaine" value={countWeek} icon="calendar-outline" accent={theme.primaryDark} />
          <KPICard title="Ce mois" value={countMonth} icon="calendar-number-outline" accent={theme.primary} />
          <View style={styles.kpiCardWrapper}>
            <KPICard title="En attente" value={countPending} icon="hourglass-outline" accent="#F59E0B" />
            {countPending > 0 && (
              <View style={styles.amberBadge}>
                <Text style={styles.amberBadgeText}>{countPending}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Alerts — last-minute */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Réservations de dernière minute</Text>
          {lastMinute.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#9CA3AF" />
              <Text style={styles.emptySectionText}>Aucune réservation imminente</Text>
            </View>
          ) : (
            lastMinute.map(b => (
              <AlertBookingCard key={b.id} type="warning" booking={b} />
            ))
          )}
        </View>

        {/* Alerts — recent cancellations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Annulations récentes (7 jours)</Text>
          {recentCancellations.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#9CA3AF" />
              <Text style={styles.emptySectionText}>Aucune annulation récente</Text>
            </View>
          ) : (
            recentCancellations.map(b => (
              <AlertBookingCard key={b.id} type="danger" booking={b} />
            ))
          )}
        </View>

        {/* Occupancy by time slot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taux d'occupation par créneau</Text>
          <View style={styles.card}>
            {slotEntries.length === 0 ? (
              <View style={styles.emptyChart}>
                <Ionicons name="time-outline" size={28} color="#D1D5DB" />
                <Text style={styles.emptyChartText}>
                  Aucun créneau configuré — définissez vos créneaux dans la gestion des créneaux
                </Text>
              </View>
            ) : (
              slotEntries.map(([slot, count]) => (
                <SlotBar key={slot} slot={slot} count={count} maxCount={maxSlotCount} color={theme.primary} />
              ))
            )}
          </View>
        </View>

        {/* Recent reviews */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Avis récents</Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Avis', 'Disponible depuis Mes Annonces')
              }
            >
              <Text style={styles.seeAll}>Voir tous les avis</Text>
            </TouchableOpacity>
          </View>
          {recentReviews.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="star-outline" size={20} color="#9CA3AF" />
              <Text style={styles.emptySectionText}>Aucun avis pour le moment</Text>
            </View>
          ) : (
            recentReviews.map(r => {
              const name =
                r.reviewer?.firstName
                  ? `${r.reviewer.firstName}${r.reviewer.lastName ? ' ' + r.reviewer.lastName : ''}`
                  : 'Client';
              const comment = r.comment ?? '';
              const truncated = comment.length > 120 ? comment.slice(0, 120) + '…' : comment;
              return (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{name}</Text>
                    <Text style={styles.reviewDate}>{formatFullDate(r.createdAt)}</Text>
                  </View>
                  <Text style={styles.reviewStars}>{renderStars(r.rating)}</Text>
                  {truncated ? (
                    <Text style={styles.reviewComment}>{truncated}</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('Bookings')}
            >
              <Ionicons name="calendar-outline" size={22} color={theme.primary} />
              <Text style={styles.quickLabel}>Réservations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('TimeSlots')}
            >
              <Ionicons name="time-outline" size={22} color={theme.primary} />
              <Text style={styles.quickLabel}>Créneaux</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('MenuManagement')}
            >
              <Ionicons name="restaurant-outline" size={22} color={theme.primary} />
              <Text style={styles.quickLabel}>Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('Promotions')}
            >
              <Ionicons name="pricetag-outline" size={22} color="#F59E0B" />
              <Text style={styles.quickLabel}>Promos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  scroll: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 20, paddingHorizontal: 20, paddingVertical: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // KPI
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCardWrapper: {
    width: '47%',
    position: 'relative',
  },
  kpiCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiValue: { fontSize: 26, fontWeight: '800', color: '#111827' },
  kpiTitle: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  amberBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  amberBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seeAll: { fontSize: 13, color: '#2563EB', fontWeight: '600' },

  // Alert cards
  alertCard: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  alertClientName: { fontWeight: '700', fontSize: 14, flex: 1 },
  alertDate: { fontSize: 12, fontWeight: '600' },
  alertMeta: {},
  alertMetaText: { fontSize: 12 },

  // Empty state
  emptySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  emptySectionText: { fontSize: 13, color: '#9CA3AF' },

  // Chart
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  barLabel: { fontSize: 12, color: '#374151', width: 70 },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 7,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFill: { backgroundColor: '#1056E0', borderRadius: 7 },
  barCount: { fontSize: 12, fontWeight: '700', color: '#374151', width: 24, textAlign: 'right' },
  emptyChart: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  emptyChartText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },

  // Reviews
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  reviewDate: { fontSize: 11, color: '#9CA3AF' },
  reviewStars: { fontSize: 14, color: '#F59E0B', marginBottom: 4 },
  reviewComment: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickLabel: { fontSize: 11, color: '#374151', fontWeight: '600', textAlign: 'center' },
});
