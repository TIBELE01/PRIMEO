import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookingsApi } from '../../../services/api/endpoints/bookings';
import { useOffline } from '../../../hooks/useOffline';
import { NetworkStatus } from '../../../components/common/NetworkStatus';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

type BookingStatus =
  | 'pending_payment' | 'confirmed'
  | 'cancelled_by_client' | 'cancelled_by_professional'
  | 'completed';

type PaymentOption = 'full_online' | 'ten_percent_online' | 'zero_online';

interface BookingItem {
  id: string;
  startDate: string;
  endDate: string;
  guests: number;
  totalAmount: number;
  onlinePaidAmount: number;
  remainingCashAmount: number;
  paymentOption: PaymentOption;
  status: BookingStatus;
  property: {
    id: string;
    title: string;
    city: string;
    propertyType?: string;
    media: Array<{ url: string }>;
  };
}

type TabKey = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'upcoming', label: 'À venir' },
  { key: 'ongoing', label: 'En cours' },
  { key: 'completed', label: 'Terminées' },
  { key: 'cancelled', label: 'Annulées' },
];

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: 'En attente de paiement',
  confirmed: 'Confirmée',
  cancelled_by_client: 'Annulée',
  cancelled_by_professional: 'Annulée par l\'hôte',
  completed: 'Terminée',
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending_payment: '#D97706',
  confirmed: '#1056E0',
  cancelled_by_client: '#DC2626',
  cancelled_by_professional: '#7C3AED',
  completed: '#0284C7',
};

const fmt = (n: number) => n.toLocaleString('fr-CI') + ' FCFA';
const BOOKINGS_CACHE_KEY = '@primeo_upcoming_bookings';

function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('fr-CI', { day: 'numeric', month: 'short' });
}

function countNights(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
}

function getTab(b: BookingItem): TabKey {
  const now = new Date();
  const start = new Date(b.startDate);
  const end = new Date(b.endDate);
  if (b.status === 'completed') return 'completed';
  if (b.status === 'cancelled_by_client' || b.status === 'cancelled_by_professional') return 'cancelled';
  if (b.status === 'confirmed' && start <= now && now <= end) return 'ongoing';
  return 'upcoming';
}

function BookingCard({ booking, onPress }: { booking: BookingItem; onPress: () => void }) {
  const nights = countNights(booking.startDate, booking.endDate);
  const imageUrl = booking.property.media?.[0]?.url;
  const hasCashBalance = booking.remainingCashAmount > 0 && booking.status === 'confirmed';
  const isRestaurant = booking.property.propertyType === 'restaurant';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardRow}>
        {imageUrl
          ? <Image source={{ uri: imageUrl }} style={styles.thumb} />
          : <View style={[styles.thumb, styles.thumbFallback]}>
              <Text style={styles.thumbEmoji}>{isRestaurant ? '🍽️' : '🏠'}</Text>
            </View>}

        <View style={styles.cardContent}>
          <Text style={styles.propertyName} numberOfLines={1}>{booking.property.title}</Text>
          <Text style={styles.city}>📍 {booking.property.city}</Text>
          {isRestaurant ? (
            <Text style={styles.dates}>
              {fmtDateShort(booking.startDate)}
              {'  ·  '}{booking.guests} couvert{booking.guests > 1 ? 's' : ''}
            </Text>
          ) : (
            <Text style={styles.dates}>
              {fmtDateShort(booking.startDate)} → {fmtDateShort(booking.endDate)}
              {'  ·  '}{nights} nuit{nights > 1 ? 's' : ''}
              {'  ·  '}{booking.guests} voy.
            </Text>
          )}
          <View style={styles.statusRow}>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[booking.status] + '20' }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLORS[booking.status] }]}>
                {STATUS_LABELS[booking.status]}
              </Text>
            </View>
          </View>
          <Text style={styles.amount}>{fmt(booking.totalAmount)}</Text>
        </View>
      </View>

      {hasCashBalance && (
        <View style={styles.cashReminder}>
          <Text style={styles.cashReminderIcon}>💵</Text>
          <Text style={styles.cashReminderText}>
            Solde à régler sur place : <Text style={styles.cashReminderAmount}>{fmt(booking.remainingCashAmount)}</Text>
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>Aucune réservation</Text>
      <Text style={styles.emptyText}>Vous n'avez pas de réservation dans la catégorie « {label} ».</Text>
    </View>
  );
}

export function MyBookingsScreen() {
  const navigation = useNavigation<Nav>();
  const isOffline = useOffline();
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (isOffline) {
      const raw = await AsyncStorage.getItem(BOOKINGS_CACHE_KEY).catch(() => null);
      if (raw) {
        setBookings(JSON.parse(raw));
        setIsFromCache(true);
      }
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setIsFromCache(false);
    try {
      const res = await bookingsApi.getMyBookings({ limit: 100, page: 1 });
      const raw = res?.data?.data ?? res?.data ?? [];
      const list: BookingItem[] = Array.isArray(raw) ? raw : raw?.data ?? [];
      setBookings(list);
      AsyncStorage.setItem(BOOKINGS_CACHE_KEY, JSON.stringify(list)).catch(() => null);
    } catch {
      const cached = await AsyncStorage.getItem(BOOKINGS_CACHE_KEY).catch(() => null);
      if (cached) {
        setBookings(JSON.parse(cached));
        setIsFromCache(true);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isOffline]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const tabData = bookings.filter(b => getTab(b) === activeTab);

  return (
    <SafeAreaView style={styles.safe}>
      <NetworkStatus />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes réservations</Text>
        {isFromCache && (
          <View style={styles.cacheBadge}>
            <Text style={styles.cacheBadgeText}>hors ligne</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {bookings.filter(b => getTab(b) === tab.key).length > 0 && (
              <View style={[styles.tabCount, activeTab === tab.key && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, activeTab === tab.key && styles.tabCountTextActive]}>
                  {bookings.filter(b => getTab(b) === tab.key).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#1056E0" />
        </View>
      ) : (
        <FlatList
          data={tabData}
          keyExtractor={b => b.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchAll(true)}
              tintColor="#1056E0"
              colors={['#1056E0']}
            />
          }
          ListEmptyComponent={
            <EmptyTab label={TABS.find(t => t.key === activeTab)?.label ?? ''} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  cacheBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  cacheBadgeText: { fontSize: 11, color: '#92400E', fontWeight: '600' },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingBottom: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#1056E0' },
  tabText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#1056E0' },
  tabCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabCountActive: { backgroundColor: '#DCFCE7' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  tabCountTextActive: { color: '#1056E0' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 32 },

  // Card
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardRow: { flexDirection: 'row', gap: 0 },
  thumb: { width: 90, height: 100 },
  thumbFallback: { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  thumbEmoji: { fontSize: 28 },
  cardContent: { flex: 1, padding: 12, gap: 3 },
  propertyName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  city: { fontSize: 12, color: '#6B7280' },
  dates: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statusRow: { flexDirection: 'row', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  amount: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 2 },

  // Cash reminder
  cashReminder: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#FDE68A' },
  cashReminderIcon: { fontSize: 14 },
  cashReminderText: { fontSize: 12, color: '#92400E', flex: 1 },
  cashReminderAmount: { fontWeight: '700' },

  // Empty
  empty: { flex: 1, alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
