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
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';
import { PageHeader } from '../../../components/layout/PageHeader';

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
  paymentOption?: string;
}

type TabKey = 'pending' | 'confirmed' | 'history';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getInitials(first?: string | null, last?: string | null): string {
  return `${(first ?? '').charAt(0)}${(last ?? '').charAt(0)}`.toUpperCase() || '?';
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#FEF3C7', text: '#D97706' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  completed: { bg: '#F3F4F6', text: '#6B7280' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{STATUS_LABEL[status] ?? status}</Text>
    </View>
  );
}

function PaymentBadge({ option }: { option?: string }) {
  if (!option) return null;
  const isCash = option === 'full_cash';
  return (
    <View style={[styles.badge, { backgroundColor: isCash ? '#FEF9C3' : '#DBEAFE' }]}>
      <Text style={[styles.badgeText, { color: isCash ? '#92400E' : '#1E40AF' }]}>
        {isCash ? 'Cash' : 'En ligne'}
      </Text>
    </View>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

function ActionButton({
  label,
  color,
  loading,
  onPress,
  icon,
}: {
  label: string;
  color: string;
  loading: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: color }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          <Ionicons name={icon} size={14} color={color} />
          <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: RestaurantBooking;
  tab: TabKey;
  onRefresh: () => void;
}

function BookingCard({ booking, tab, onRefresh }: BookingCardProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const runAction = useCallback(
    async (key: string, fn: () => Promise<unknown>, errorMsg?: string) => {
      setLoadingAction(key);
      try {
        await fn();
        onRefresh();
      } catch {
        Alert.alert('Erreur', errorMsg ?? 'Une erreur est survenue. Veuillez réessayer.');
      } finally {
        setLoadingAction(null);
      }
    },
    [onRefresh],
  );

  const handleConfirm = () => {
    Alert.alert(
      'Confirmer la réservation',
      `Confirmer la réservation de ${booking.client.firstName} ${booking.client.lastName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => runAction('confirm', () => bookingsApi.confirm(booking.id)),
        },
      ],
    );
  };

  const handleRefuse = () => {
    Alert.prompt(
      'Refuser la réservation',
      'Motif du refus (optionnel)',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: (value?: string) => {
            const reason = value?.trim() || 'Refus par le restaurant';
            runAction('refuse', () => bookingsApi.cancel(booking.id, reason));
          },
        },
      ],
      'plain-text',
    );
  };

  const handleNoShow = () => {
    Alert.alert(
      'Non-présentation',
      'Marquer comme non-venu ? Le client recevra un avertissement sur son profil.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: () =>
            runAction(
              'noshow',
              async () => {
                try {
                  await restaurantApi.markNoShow(booking.id);
                } catch {
                  Alert.alert('Information', 'Service disponible prochainement.');
                }
              },
            ),
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler la réservation',
      'Annuler cette réservation confirmée ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler la réservation',
          style: 'destructive',
          onPress: () =>
            runAction('cancel', () =>
              bookingsApi.cancel(booking.id, 'Annulation par le restaurant'),
            ),
        },
      ],
    );
  };

  const initials = getInitials(booking.client.firstName, booking.client.lastName);
  const specialReq = booking.specialRequests?.trim() ?? '';
  const truncatedReq = specialReq.length > 60 ? specialReq.slice(0, 60) + '…' : specialReq;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Avatar initials={initials} />
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.clientName}>
            {booking.client.firstName} {booking.client.lastName}
          </Text>
          <Text style={styles.propertyName}>{booking.property.name}</Text>
          {booking.timeSlot ? (
            <Text style={styles.timeSlotText}>{booking.timeSlot}</Text>
          ) : null}
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.cardDate}>{formatDate(booking.startDate)}</Text>
          <StatusBadge status={booking.status} />
        </View>
      </View>

      {/* Covers row */}
      <View style={styles.detailRow}>
        <Ionicons name="people-outline" size={14} color="#6B7280" />
        <Text style={styles.detailText}>
          {booking.guests} couvert{booking.guests > 1 ? 's' : ''}
        </Text>
        <PaymentBadge option={booking.paymentOption} />
      </View>

      {/* Special requests pill */}
      {truncatedReq.length > 0 && (
        <View style={styles.specialReqRow}>
          <View style={styles.specialReqPill}>
            <Ionicons name="information-circle-outline" size={12} color="#92400E" />
            <Text style={styles.specialReqText}>{truncatedReq}</Text>
          </View>
        </View>
      )}

      {/* Cancellation reason (history) */}
      {tab === 'history' && booking.status === 'cancelled' && booking.cancellationReason ? (
        <Text style={styles.cancellationReason}>
          Motif : {booking.cancellationReason}
        </Text>
      ) : null}

      {/* Actions */}
      {tab === 'pending' && (
        <View style={styles.cardActions}>
          <ActionButton
            label="Confirmer"
            color="#1056E0"
            loading={loadingAction === 'confirm'}
            onPress={handleConfirm}
            icon="checkmark-circle-outline"
          />
          <ActionButton
            label="Refuser"
            color="#DC2626"
            loading={loadingAction === 'refuse'}
            onPress={handleRefuse}
            icon="close-circle-outline"
          />
        </View>
      )}

      {tab === 'confirmed' && (
        <View style={styles.cardActions}>
          <ActionButton
            label="No-show"
            color="#D97706"
            loading={loadingAction === 'noshow'}
            onPress={handleNoShow}
            icon="person-remove-outline"
          />
          <ActionButton
            label="Annuler"
            color="#DC2626"
            loading={loadingAction === 'cancel'}
            onPress={handleCancel}
            icon="close-circle-outline"
          />
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending',   label: 'En attente' },
  { key: 'confirmed', label: 'Confirmées' },
  { key: 'history',   label: 'Historique' },
];

export default function RestaurantBookingsScreen() {
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [bookings, setBookings] = useState<Record<TabKey, RestaurantBooking[]>>({
    pending: [],
    confirmed: [],
    history: [],
  });
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({
    pending: true,
    confirmed: true,
    history: true,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchTab = useCallback(async (tab: TabKey, silent = false) => {
    if (!silent) {
      setLoading(prev => ({ ...prev, [tab]: true }));
    }

    const paramsByTab: Record<TabKey, Record<string, unknown>> = {
      pending:   { role: 'host', status: 'pending' },
      confirmed: { role: 'host', status: 'confirmed' },
      history:   { role: 'host', status: 'completed,cancelled' },
    };

    try {
      const res = await bookingsApi.getMyBookings(paramsByTab[tab]);
      const data: RestaurantBooking[] = res.data?.data ?? res.data ?? [];
      setBookings(prev => ({ ...prev, [tab]: Array.isArray(data) ? data : [] }));
    } catch {
      // keep previous data
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }));
    }
  }, []);

  const fetchAll = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      await Promise.allSettled(TABS.map(t => fetchTab(t.key, silent)));
      if (silent) setRefreshing(false);
    },
    [fetchTab],
  );

  useEffect(() => { fetchAll(false); }, [fetchAll]);

  const handleRefresh = useCallback(() => { fetchAll(true); }, [fetchAll]);
  const handleTabRefresh = useCallback(() => { fetchTab(activeTab, true); }, [activeTab, fetchTab]);

  const isLoading = loading[activeTab];
  const currentBookings = bookings[activeTab];

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader title="Réservations" />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {bookings[tab.key].length > 0 && (
              <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                  {bookings[tab.key].length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1056E0" />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#1056E0']}
              tintColor="#1056E0"
            />
          }
        >
          {currentBookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Aucune réservation</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'pending'
                  ? 'Aucune demande en attente.'
                  : activeTab === 'confirmed'
                  ? 'Aucune réservation confirmée pour le moment.'
                  : 'Votre historique apparaîtra ici.'}
              </Text>
            </View>
          ) : (
            currentBookings.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                tab={activeTab}
                onRefresh={handleTabRefresh}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: '#1056E0' },
  tabLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabLabelActive: { color: '#1056E0', fontWeight: '700' },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: '#D1FAE5' },
  tabBadgeText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  tabBadgeTextActive: { color: '#1056E0' },

  // Content
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 80 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  cardHeaderInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  propertyName: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  timeSlotText: {
    fontSize: 12,
    color: '#1056E0',
    fontWeight: '600',
    marginTop: 2,
  },
  cardHeaderRight: { alignItems: 'flex-end', gap: 4 },
  cardDate: { fontSize: 12, color: '#6B7280', fontWeight: '600' },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  detailText: { fontSize: 13, color: '#6B7280', flex: 1 },

  specialReqRow: { marginBottom: 8 },
  specialReqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  specialReqText: { fontSize: 11, color: '#92400E', fontWeight: '600' },

  cancellationReason: {
    fontSize: 11,
    color: '#DC2626',
    fontStyle: 'italic',
    marginBottom: 4,
  },

  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    justifyContent: 'center',
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#065F46' },
});
