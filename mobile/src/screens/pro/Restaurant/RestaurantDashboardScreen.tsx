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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { bookingsApi } from '../../../services/api/endpoints/bookings';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { reviewsApi } from '../../../services/api/endpoints/reviews';
import { useProTheme } from '../../../hooks/useProTheme';

const { width } = Dimensions.get('window');

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
  return new Date().toISOString().split('T')[0];
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

function formatTime(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

// ─── Composants ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent: string;
  bg: string;
}

function StatCard({ label, value, icon, accent, bg }: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIconWrap, { backgroundColor: accent + '22' }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface QuickActionProps {
  label: string;
  sub: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress: () => void;
}

function QuickAction({ label, sub, icon, color, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.actionIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

function BookingPill({ booking }: { booking: RestaurantBooking }) {
  const statusColor = booking.status === 'confirmed' ? '#16A34A' : booking.status === 'pending' ? '#D97706' : '#6B7280';
  const statusBg    = booking.status === 'confirmed' ? '#F0FDF4' : booking.status === 'pending' ? '#FFFBEB' : '#F9FAFB';
  const statusLabel = booking.status === 'confirmed' ? 'Confirmé' : booking.status === 'pending' ? 'En attente' : 'Autre';
  const time = booking.timeSlot ?? formatTime(booking.startDate);
  return (
    <View style={styles.bookingPill}>
      <View style={styles.bookingPillTime}>
        <Text style={styles.bookingPillTimeText}>{time}</Text>
      </View>
      <View style={styles.bookingPillInfo}>
        <Text style={styles.bookingPillName}>{booking.client.firstName} {booking.client.lastName}</Text>
        <Text style={styles.bookingPillGuests}>{booking.guests} couvert{booking.guests > 1 ? 's' : ''}</Text>
      </View>
      <View style={[styles.statusChip, { backgroundColor: statusBg }]}>
        <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const name = review.reviewer?.firstName
    ? `${review.reviewer.firstName}${review.reviewer.lastName ? ' ' + review.reviewer.lastName[0] + '.' : ''}`
    : 'Client';
  const stars = '★'.repeat(Math.round(review.rating)) + '☆'.repeat(5 - Math.round(review.rating));
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>{name[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewName}>{name}</Text>
          <Text style={styles.reviewDate}>{formatFullDate(review.createdAt)}</Text>
        </View>
        <Text style={styles.reviewStars}>{stars}</Text>
      </View>
      {review.comment ? (
        <Text style={styles.reviewComment} numberOfLines={2}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function RestaurantDashboardScreen() {
  const navigation  = useNavigation<any>();
  const theme       = useProTheme();
  const PRIMARY     = theme.primary;    // rouge restaurant
  const PRIMARY_DARK = theme.primaryDark;

  const [propertyId,   setPropertyId]   = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState<string>('Mon restaurant');
  const [pending,      setPending]      = useState<RestaurantBooking[]>([]);
  const [confirmed,    setConfirmed]    = useState<RestaurantBooking[]>([]);
  const [completed,    setCompleted]    = useState<RestaurantBooking[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [cancelled,    setCancelled]    = useState<RestaurantBooking[]>([]);
  const [reviews,      setReviews]      = useState<Review[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [noProperty,   setNoProperty]   = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // Récupérer le restaurant de ce professionnel
      let pid: string | null = null;
      let pname = 'Mon restaurant';
      try {
        const propRes = await propertiesApi.getMyListings();
        const listings = propRes.data?.data ?? propRes.data ?? [];
        if (Array.isArray(listings) && listings.length > 0) {
          pid   = listings[0].id as string;
          pname = (listings[0].title ?? listings[0].name ?? 'Mon restaurant') as string;
        }
      } catch { /* pas de restaurant encore */ }

      setPropertyId(pid);
      setPropertyName(pname);
      setNoProperty(!pid);

      // Charger réservations et avis en parallèle
      const [confirmedRes, completedRes, cancelledClientRes, cancelledProRes, reviewsRes] =
        await Promise.allSettled([
          bookingsApi.getMyBookings({ status: 'confirmed', limit: 50 }),
          bookingsApi.getMyBookings({ status: 'completed', limit: 50 }),
          bookingsApi.getMyBookings({ status: 'cancelled_by_client',       limit: 50 }),
          bookingsApi.getMyBookings({ status: 'cancelled_by_professional', limit: 50 }),
          pid
            ? reviewsApi.getForProperty(pid, { limit: 5 })
            : Promise.reject(new Error('no property')),
        ]);

      const safe = (res: PromiseSettledResult<any>): any[] => {
        if (res.status !== 'fulfilled') return [];
        const d = res.value.data?.data ?? res.value.data ?? [];
        return Array.isArray(d) ? d : [];
      };

      // Les restaurants n'ont pas de paiement en attente (confirmed immédiatement)
      // On agrège confirmed comme "pending" lorsqu'ils sont futurs non encore honorés
      const allConfirmed = safe(confirmedRes);
      setConfirmed(allConfirmed);
      // Réservations futures confirmées non encore honorées = « en attente »
      const todayDate = todayStr();
      setPending(allConfirmed.filter(b => (b.startDate ?? '').split('T')[0] >= todayDate));
      setCompleted(safe(completedRes));
      setCancelled([...safe(cancelledClientRes), ...safe(cancelledProRes)]);
      setReviews(safe(reviewsRes));
    } catch { /* erreur silencieuse au niveau supérieur */ } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const today         = todayStr();
  const couverts      = confirmed.filter(b => b.startDate?.split('T')[0] === today).reduce((s, b) => s + b.guests, 0);
  const reservSemaine = confirmed.filter(b => inNextNDays(b.startDate, 7)).length;
  const reservMois    = confirmed.filter(b => sameMonth(b.startDate)).length;
  const avgRating     = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  // Réservations d'aujourd'hui et de demain (confirmées + en attente)
  const todayBookings = [...pending, ...confirmed]
    .filter(b => b.startDate?.split('T')[0] === today)
    .sort((a, b) => (a.timeSlot ?? a.startDate).localeCompare(b.timeSlot ?? b.startDate));

  const pendingCount = pending.length;

  // Annulations récentes
  const recentCancellations = cancelled.filter(b =>
    b.cancelledAt ? inLastNDays(b.cancelledAt, 7) : inLastNDays(b.createdAt ?? '', 7)
  );

  // ── Onboarding : aucun restaurant ────────────────────────────────────────
  if (!isLoading && noProperty) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.onboardingContainer}>
          <View style={[styles.onboardingIcon, { backgroundColor: PRIMARY + '18' }]}>
            <Ionicons name="restaurant" size={56} color={PRIMARY} />
          </View>
          <Text style={styles.onboardingTitle}>Bienvenue sur Primeo !</Text>
          <Text style={styles.onboardingSubtitle}>
            Commencez par créer votre fiche restaurant pour gérer vos réservations,
            votre menu et vos créneaux.
          </Text>
          <TouchableOpacity
            style={[styles.onboardingBtn, { backgroundColor: PRIMARY }]}
            onPress={() => navigation.navigate('AddProperty', { initialType: 'restaurant' })}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.onboardingBtnText}>Créer mon restaurant</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Chargement…</Text>
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
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* ── Hero Header ──────────────────────────────────────────────────── */}
        <View style={[styles.hero, { backgroundColor: PRIMARY }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroGreeting}>{getGreeting()}</Text>
              <Text style={styles.heroName} numberOfLines={1}>{propertyName}</Text>
            </View>
            <TouchableOpacity
              style={styles.heroNotif}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              {pendingCount > 0 && (
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Stats rapides dans le hero */}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{couverts}</Text>
              <Text style={styles.heroStatLabel}>Couverts aujourd'hui</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{reservSemaine}</Text>
              <Text style={styles.heroStatLabel}>Réservations / 7j</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{avgRating}</Text>
              <Text style={styles.heroStatLabel}>Note moyenne</Text>
            </View>
          </View>
        </View>

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <View style={styles.statRow}>
          <StatCard label="Ce mois"    value={reservMois}    icon="calendar-number-outline" accent={PRIMARY}      bg="#fff" />
          <StatCard label="En attente" value={pendingCount}  icon="hourglass-outline"       accent="#D97706"       bg="#fff" />
          <StatCard label="Annulations" value={recentCancellations.length} icon="close-circle-outline" accent="#6B7280" bg="#fff" />
        </View>

        {/* ── Réservations du jour ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aujourd'hui</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
              <Text style={[styles.seeAll, { color: PRIMARY }]}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {todayBookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color="#D1D5DB" />
              <Text style={styles.emptyCardText}>Aucune réservation pour aujourd'hui</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {todayBookings.map((b, i) => (
                <React.Fragment key={b.id}>
                  <BookingPill booking={b} />
                  {i < todayBookings.length - 1 && <View style={styles.pillDivider} />}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>

        {/* ── Actions rapides ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <QuickAction
            label="Menu"
            sub="Gérer vos plats et boissons"
            icon="restaurant-outline"
            color={PRIMARY}
            onPress={() => navigation.navigate('MenuManagement')}
          />
          <QuickAction
            label="Réservations"
            sub="Tables et créneaux confirmés"
            icon="calendar-outline"
            color="#2563EB"
            onPress={() => navigation.navigate('Bookings')}
          />
          <QuickAction
            label="Créneaux horaires"
            sub="Gérer vos heures d'ouverture"
            icon="time-outline"
            color="#7C3AED"
            onPress={() => navigation.navigate('TimeSlots')}
          />
          <QuickAction
            label="Promotions"
            sub="Codes promo et offres spéciales"
            icon="pricetag-outline"
            color="#D97706"
            onPress={() => navigation.navigate('Promotions')}
          />
          <QuickAction
            label="Commandes en ligne"
            sub="Suivre les commandes à emporter"
            icon="receipt-outline"
            color="#059669"
            onPress={() => navigation.navigate('FoodOrders')}
          />
        </View>

        {/* ── Alertes annulations ──────────────────────────────────────────── */}
        {recentCancellations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Annulations récentes</Text>
            <View style={styles.alertBanner}>
              <Ionicons name="warning-outline" size={18} color="#92400E" />
              <Text style={styles.alertBannerText}>
                {recentCancellations.length} annulation{recentCancellations.length > 1 ? 's' : ''} ces 7 derniers jours
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
                <Text style={styles.alertBannerLink}>Voir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Avis récents ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Avis récents</Text>
            {reviews.length > 0 && (
              <Text style={[styles.seeAll, { color: PRIMARY }]}>
                {reviews.length} avis
              </Text>
            )}
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="star-outline" size={32} color="#D1D5DB" />
              <Text style={styles.emptyCardText}>Aucun avis pour le moment</Text>
              <Text style={styles.emptyCardSub}>Les avis de vos clients apparaîtront ici</Text>
            </View>
          ) : (
            reviews.slice(0, 3).map(r => <ReviewCard key={r.id} review={r} />)
          )}
        </View>

        {/* ── Pied de page ─────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerBtn, { borderColor: PRIMARY }]}
            onPress={() => navigation.navigate('Analytics')}
          >
            <Ionicons name="bar-chart-outline" size={16} color={PRIMARY} />
            <Text style={[styles.footerBtnText, { color: PRIMARY }]}>Voir mes statistiques</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F4F5F7' },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  scroll:      { paddingBottom: 40 },

  // Onboarding
  onboardingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16,
  },
  onboardingIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  onboardingTitle: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center' },
  onboardingSubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  onboardingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8,
  },
  onboardingBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Hero
  hero: {
    paddingTop: 20, paddingBottom: 28, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 2 },
  heroName:     { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroNotif:    { padding: 8, position: 'relative' },
  heroBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#FCD34D', borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#111' },
  heroStats:   { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 16, gap: 0 },
  heroStat:    { flex: 1, alignItems: 'center' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  heroStatValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2, textAlign: 'center' },

  // Stat row
  statRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16, marginBottom: 4,
  },
  statCard: {
    flex: 1, borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  statIconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  statValue:    { fontSize: 22, fontWeight: '800' },
  statLabel:    { fontSize: 10, color: '#6B7280', fontWeight: '600', textAlign: 'center' },

  // Sections
  section:     { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.6 },
  seeAll:       { fontSize: 13, fontWeight: '600' },

  // Card générique
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },

  // Booking pill
  bookingPill: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  pillDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 14 },
  bookingPillTime: {
    backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 56, alignItems: 'center',
  },
  bookingPillTimeText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  bookingPillInfo: { flex: 1 },
  bookingPillName:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  bookingPillGuests: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  statusChip:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusChipText: { fontSize: 11, fontWeight: '700' },

  // Quick actions
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  actionSub:   { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Empty state
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  emptyCardText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500', textAlign: 'center' },
  emptyCardSub:  { fontSize: 12, color: '#D1D5DB', textAlign: 'center' },

  // Alert banner
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14,
    borderLeftWidth: 4, borderLeftColor: '#F59E0B',
  },
  alertBannerText: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '500' },
  alertBannerLink: { fontSize: 13, fontWeight: '700', color: '#D97706' },

  // Reviews
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  reviewTop:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 15, fontWeight: '800', color: '#6B7280' },
  reviewName:       { fontSize: 14, fontWeight: '700', color: '#111827' },
  reviewDate:       { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  reviewStars:      { fontSize: 14, color: '#F59E0B' },
  reviewComment:    { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  // Footer
  footer: { paddingHorizontal: 16, marginTop: 20 },
  footerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1.5, paddingVertical: 14,
  },
  footerBtnText: { fontSize: 14, fontWeight: '700' },
});
