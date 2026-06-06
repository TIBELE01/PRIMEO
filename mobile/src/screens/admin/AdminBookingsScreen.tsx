import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { adminApi } from '../../services/api/endpoints/adminApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingSummary {
  id: string;
  status: string;
  totalAmount: number;
  onlinePaidAmount?: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  client?: { firstName: string; lastName: string; email: string };
  property?: { title: string; propertyType: string; city: string };
}

interface BookingDetail extends BookingSummary {
  nights?: number;
  property?: {
    title: string;
    propertyType: string;
    city: string;
    owner: { firstName: string; lastName: string; email: string };
  };
  client?: { firstName: string; lastName: string; email: string; phone?: string };
  payment?: { method: string; status: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending:   { label: 'En attente',  color: '#D97706', icon: 'time-outline'                  },
  confirmed: { label: 'Confirmée',   color: '#1056E0', icon: 'checkmark-circle-outline'       },
  active:    { label: 'En cours',    color: '#059669', icon: 'play-circle-outline'             },
  completed: { label: 'Terminée',    color: '#059669', icon: 'checkmark-done-circle-outline'  },
  cancelled: { label: 'Annulée',     color: '#6B7280', icon: 'close-circle-outline'            },
  rejected:  { label: 'Refusée',     color: '#DC2626', icon: 'close-circle-outline'            },
};

const TYPE_LABELS: Record<string, string> = {
  residence:           'Résidence',
  hotel:               'Hôtel',
  immobilier_location: 'Location',
  immobilier_terrain:  'Terrain',
  immobilier_achat:    'Vente',
  restaurant:          'Restaurant',
};

const FILTERS = [
  { key: 'all',       label: 'Toutes'    },
  { key: 'active',    label: 'En cours'  },
  { key: 'completed', label: 'Terminées' },
  { key: 'cancelled', label: 'Annulées'  },
] as const;
type FilterKey = typeof FILTERS[number]['key'];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// ── Booking detail modal ───────────────────────────────────────────────────────

function BookingDetailModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getBooking(bookingId)
      .then(r => setBooking(r.data?.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingId]);

  const cfg = booking
    ? (STATUS_CONFIG[booking.status] ?? { label: booking.status, color: '#6B7280', icon: 'help-circle-outline' })
    : null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={dm.safe}>
        {/* En-tête */}
        <View style={dm.header}>
          <TouchableOpacity onPress={onClose} style={dm.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={dm.headerTitle}>Détail de la réservation</Text>
          {cfg && (
            <View style={[dm.statusBadge, { backgroundColor: cfg.color + '30' }]}>
              <Text style={[dm.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color="#1056E0" />
        ) : !booking ? (
          <View style={dm.centered}><Text style={dm.errorText}>Réservation introuvable</Text></View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Propriété */}
            <View style={dm.section}>
              <Text style={dm.sectionTitle}>Propriété</Text>
              <DRow icon="home-outline"     label="Titre"           value={booking.property?.title ?? '—'} />
              <DRow icon="grid-outline"     label="Type"            value={TYPE_LABELS[booking.property?.propertyType ?? ''] ?? booking.property?.propertyType ?? '—'} />
              <DRow icon="location-outline" label="Ville"           value={booking.property?.city ?? '—'} />
              <DRow icon="person-outline"   label="Propriétaire"    value={booking.property?.owner ? `${booking.property.owner.firstName} ${booking.property.owner.lastName}` : '—'} />
              <DRow icon="mail-outline"     label="Email propriét." value={booking.property?.owner?.email ?? '—'} />
            </View>

            {/* Client */}
            <View style={dm.section}>
              <Text style={dm.sectionTitle}>Client</Text>
              <DRow icon="person-outline" label="Nom"       value={booking.client ? `${booking.client.firstName} ${booking.client.lastName}` : '—'} />
              <DRow icon="mail-outline"   label="Email"     value={booking.client?.email ?? '—'} />
              {booking.client?.phone ? (
                <DRow icon="call-outline" label="Téléphone" value={booking.client.phone} />
              ) : null}
            </View>

            {/* Séjour */}
            <View style={dm.section}>
              <Text style={dm.sectionTitle}>Séjour & Paiement</Text>
              <DRow icon="calendar-outline" label="Arrivée"      value={formatDate(booking.startDate)} />
              <DRow icon="calendar-outline" label="Départ"       value={formatDate(booking.endDate)} />
              {booking.nights != null ? (
                <DRow icon="moon-outline"   label="Durée"        value={`${booking.nights} nuit${booking.nights > 1 ? 's' : ''}`} />
              ) : null}
              <DRow icon="cash-outline"     label="Montant total" value={`${(booking.totalAmount ?? 0).toLocaleString('fr-CI')} FCFA`} />
              {booking.onlinePaidAmount != null ? (
                <DRow icon="card-outline"   label="Payé en ligne" value={`${booking.onlinePaidAmount.toLocaleString('fr-CI')} FCFA`} />
              ) : null}
              {booking.payment?.method ? (
                <DRow icon="wallet-outline" label="Méthode"      value={booking.payment.method} />
              ) : null}
              <DRow icon="time-outline"     label="Réservée le"  value={formatDate(booking.createdAt)} />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function DRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={dm.drow}>
      <Ionicons name={icon as any} size={14} color="#9CA3AF" style={{ marginRight: 8, marginTop: 2 }} />
      <Text style={dm.drowLabel}>{label} :</Text>
      <Text style={dm.drowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({ booking, onPress }: { booking: BookingSummary; onPress: () => void }) {
  const cfg = STATUS_CONFIG[booking.status] ?? { label: booking.status, color: '#6B7280', icon: 'help-circle-outline' };
  const clientName = booking.client
    ? `${booking.client.firstName} ${booking.client.lastName}`
    : '—';
  return (
    <TouchableOpacity style={sc.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[sc.iconWrap, { backgroundColor: cfg.color + '15' }]}>
        <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
      </View>
      <View style={sc.cardBody}>
        <Text style={sc.propertyName} numberOfLines={1}>{booking.property?.title ?? '—'}</Text>
        <Text style={sc.clientName}>{clientName}</Text>
        <View style={sc.meta}>
          <Ionicons name="calendar-outline" size={11} color="#9CA3AF" />
          <Text style={sc.metaText}>{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</Text>
        </View>
        <View style={sc.meta}>
          <Ionicons name="cash-outline" size={11} color="#9CA3AF" />
          <Text style={sc.metaText}>{(booking.totalAmount ?? 0).toLocaleString('fr-CI')} FCFA</Text>
        </View>
      </View>
      <View style={sc.cardRight}>
        <View style={[sc.badge, { backgroundColor: cfg.color + '18' }]}>
          <Text style={[sc.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginTop: 6 }} />
      </View>
    </TouchableOpacity>
  );
}

// ── Écran principal ────────────────────────────────────────────────────────────

export default function AdminBookingsScreen() {
  const navigation = useNavigation();
  const [bookings, setBookings]  = useState<BookingSummary[]>([]);
  const [loading, setLoading]    = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [filter, setFilter]      = useState<FilterKey>('all');
  const [search, setSearch]      = useState('');
  const [selectedId, setSelected] = useState<string | null>(null);

  const fetchBookings = useCallback(async (silent = false) => {
    if (silent) setRefresh(true); else setLoading(true);
    try {
      const res = await adminApi.listBookings({ limit: 100 });
      const data = res.data?.data ?? res.data;
      setBookings(Array.isArray(data) ? data : (data?.items ?? data?.bookings ?? []));
    } catch {
      setBookings([]);
    } finally {
      if (silent) setRefresh(false); else setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Filtre par statut
  const matchFilter = (b: BookingSummary) => {
    if (filter === 'all')       return true;
    if (filter === 'active')    return b.status === 'active' || b.status === 'confirmed' || b.status === 'pending';
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'cancelled') return b.status === 'cancelled' || b.status === 'rejected';
    return true;
  };

  const filtered = bookings.filter(b => {
    if (!matchFilter(b)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchProp   = b.property?.title?.toLowerCase().includes(q) ?? false;
      const matchClient = b.client
        ? `${b.client.firstName} ${b.client.lastName}`.toLowerCase().includes(q)
        : false;
      return matchProp || matchClient;
    }
    return true;
  });

  const counts: Record<FilterKey, number> = {
    all:       bookings.length,
    active:    bookings.filter(b => b.status === 'active' || b.status === 'confirmed' || b.status === 'pending').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected').length,
  };

  return (
    <SafeAreaView style={sc.safe}>
      {/* En-tête */}
      <View style={sc.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={sc.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={sc.headerText}>
          <Text style={sc.title}>Réservations</Text>
          <Text style={sc.subtitle}>{bookings.length} réservation{bookings.length !== 1 ? 's' : ''} au total</Text>
        </View>
        <TouchableOpacity onPress={() => fetchBookings(true)} style={sc.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {/* Recherche */}
      <View style={sc.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" />
        <TextInput
          style={sc.searchInput}
          placeholder="Rechercher par propriété ou client..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Onglets de filtre */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={sc.tabsWrap}
        contentContainerStyle={sc.tabs}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[sc.tab, filter === f.key && sc.tabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[sc.tabText, filter === f.key && sc.tabTextActive]}>
              {f.label}{counts[f.key] > 0 ? ` (${counts[f.key]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#1056E0" />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBookings(true)}
              tintColor="#1056E0"
              colors={['#1056E0']}
            />
          }
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
        >
          {filtered.length === 0 ? (
            <View style={sc.empty}>
              <Ionicons name="calendar-outline" size={52} color="#E5E7EB" />
              <Text style={sc.emptyTitle}>
                {search.trim()
                  ? 'Aucun résultat pour cette recherche'
                  : `Aucune réservation ${filter !== 'all' ? FILTERS.find(f => f.key === filter)?.label?.toLowerCase() ?? '' : ''}`}
              </Text>
            </View>
          ) : (
            filtered.map(b => (
              <BookingCard key={b.id} booking={b} onPress={() => setSelected(b.id)} />
            ))
          )}
        </ScrollView>
      )}

      {selectedId && (
        <BookingDetailModal bookingId={selectedId} onClose={() => setSelected(null)} />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F8FAFC' },
  header:        { backgroundColor: '#1056E0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  backBtn:       { padding: 4 },
  headerText:    { flex: 1 },
  title:         { fontSize: 18, fontWeight: '800', color: '#fff' },
  subtitle:      { fontSize: 12, color: '#BFDBFE', marginTop: 1 },
  refreshBtn:    { padding: 4 },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: '#E5E7EB', gap: 8 },
  searchInput:   { flex: 1, fontSize: 14, color: '#111827' },
  tabsWrap:      { maxHeight: 48 },
  tabs:          { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  tab:           { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  tabActive:     { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  tabText:       { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  card:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 10, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  iconWrap:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  cardBody:      { flex: 1 },
  propertyName:  { fontSize: 14, fontWeight: '700', color: '#111827' },
  clientName:    { fontSize: 12, color: '#1056E0', fontWeight: '600', marginTop: 2 },
  meta:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText:      { fontSize: 11, color: '#9CA3AF' },
  cardRight:     { alignItems: 'flex-end', marginLeft: 8 },
  badge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText:     { fontSize: 9, fontWeight: '700' },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: '#374151', marginTop: 16 },
});

const dm = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F8FAFC' },
  header:        { backgroundColor: '#1056E0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  backBtn:       { padding: 4 },
  headerTitle:   { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff' },
  statusBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText:    { fontSize: 11, fontWeight: '700' },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:     { fontSize: 15, color: '#9CA3AF' },
  section:       { marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle:  { fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  drow:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 9 },
  drowLabel:     { fontSize: 13, color: '#6B7280', width: 130, flexShrink: 0 },
  drowValue:     { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1 },
});
