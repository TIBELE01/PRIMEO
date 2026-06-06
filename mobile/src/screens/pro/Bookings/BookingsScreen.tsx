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
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { bookingsApi } from '../../../services/api/endpoints/bookings';
import { clientRatingsApi } from '../../../services/api/endpoints/clientRatings';
import { disputesApi } from '../../../services/api/endpoints/disputes';
import { useProTheme } from '../../../hooks/useProTheme';

// Dispute reasons (mirror backend CreateDisputeDto enum)
const DISPUTE_REASONS: { key: string; label: string }[] = [
  { key: 'non_conformity', label: 'Non-conformité' },
  { key: 'payment_issue', label: 'Problème de paiement' },
  { key: 'cancellation', label: 'Annulation abusive' },
  { key: 'no_show', label: 'Client absent (no-show)' },
  { key: 'other', label: 'Autre problème' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  paymentOption: 'full_online' | 'ten_percent_online' | 'full_cash';
  cashReceived?: boolean;
  property: { id: string; name: string; city: string };
  client: { id: string; firstName: string; lastName: string; phone?: string };
  createdAt: string;
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

function formatAmount(n: number): string {
  return `${n.toLocaleString('fr-CI')} FCFA`;
}

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ─── Status badge ─────────────────────────────────────────────────────────────

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

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {STATUS_LABEL[status] ?? status}
      </Text>
    </View>
  );
}

function PaymentBadge({ option }: { option: string }) {
  const isCash = option === 'full_cash';
  return (
    <View style={[styles.badge, { backgroundColor: isCash ? '#FEF9C3' : '#DBEAFE' }]}>
      <Text style={[styles.badgeText, { color: isCash ? '#92400E' : '#1E40AF' }]}>
        {isCash ? 'Cash' : 'En ligne'}
      </Text>
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ initials }: { initials: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

interface ClientAggregate {
  overallAvg: number;
  totalRatings: number;
  avgRespect: number;
  avgCommunication: number;
  avgPunctuality: number;
  avgRules: number;
}

interface BookingCardProps {
  booking: Booking;
  tab: TabKey;
  onRefresh: () => void;
  isRated?: boolean;
}

function BookingCard({ booking, tab, onRefresh, isRated }: BookingCardProps) {
  const navigation = useNavigation<any>();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientAggregate | null>(null);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('other');
  const [reportText, setReportText] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const { client, property } = booking;
  const initials = getInitials(client.firstName, client.lastName);

  const handleToggleProfile = async () => {
    if (!profileExpanded && !clientProfile) {
      setProfileLoading(true);
      try {
        const res = await clientRatingsApi.getClientAggregate(client.id);
        setClientProfile(res.data?.data ?? res.data);
      } catch { /* no profile available */ } finally {
        setProfileLoading(false);
      }
    }
    setProfileExpanded(v => !v);
  };

  const runAction = useCallback(
    async (key: string, fn: () => Promise<unknown>) => {
      setLoadingAction(key);
      try {
        await fn();
        onRefresh();
      } catch {
        Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
      } finally {
        setLoadingAction(null);
      }
    },
    [onRefresh],
  );

  const handleAccept = () => {
    Alert.alert(
      'Accepter la réservation',
      `Confirmer la réservation de ${client.firstName} ${client.lastName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: () => runAction('accept', () => bookingsApi.confirm(booking.id)),
        },
      ],
    );
  };

  const handleRefuse = () => {
    let reason = '';
    Alert.prompt(
      'Refuser la réservation',
      'Motif du refus (optionnel)',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: (value: string | undefined) => {
            reason = value ?? 'Refus par le professionnel';
            runAction('refuse', () => bookingsApi.cancel(booking.id, reason));
          },
        },
      ],
      'plain-text',
    );
  };

  const handleContact = () => {
    const phone = client.phone?.replace(/\s/g, '');
    if (!phone) {
      Alert.alert('Contact indisponible', 'Aucun numéro de téléphone n\'est associé à ce client.');
      return;
    }
    Alert.alert(
      `Contacter ${client.firstName}`,
      phone,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler', onPress: () => Linking.openURL(`tel:${phone}`) },
        { text: 'SMS', onPress: () => Linking.openURL(`sms:${phone}`) },
      ],
    );
  };

  const handleMarkCash = () => {
    Alert.alert(
      'Confirmer la réception',
      'Confirmer avoir reçu le paiement en espèces ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => runAction('cash', () => bookingsApi.markCashReceived(booking.id)),
        },
      ],
    );
  };

  const handleCancelConfirmed = () => {
    Alert.alert(
      'Annuler la réservation',
      'Annuler cette réservation confirmée peut entraîner une pénalité et affecter votre note de fiabilité. Le client sera remboursé selon les conditions d\'annulation. Continuer ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler quand même',
          style: 'destructive',
          onPress: () =>
            runAction('cancel', () =>
              bookingsApi.cancel(booking.id, 'Annulation par le professionnel'),
            ),
        },
      ],
    );
  };

  const handleReport = () => {
    setReportReason('other');
    setReportText('');
    setReportVisible(true);
  };

  const submitReport = async () => {
    if (reportText.trim().length < 20) {
      Alert.alert('Description trop courte', 'Merci de décrire le problème en au moins 20 caractères.');
      return;
    }
    setReportSubmitting(true);
    try {
      await disputesApi.create({ bookingId: booking.id, reason: reportReason, description: reportText.trim() });
      setReportVisible(false);
      Alert.alert('Litige ouvert', 'Votre signalement a été transmis à notre équipe de modération. Vous serez notifié du suivi.');
      onRefresh();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = status === 409
        ? 'Un litige existe déjà pour cette réservation.'
        : (e?.response?.data?.message ?? 'Impossible d\'ouvrir le litige. Veuillez réessayer.');
      Alert.alert('Erreur', msg);
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
    >
      {/* Unrated indicator for completed bookings */}
      {tab === 'history' && booking.status === 'completed' && !isRated && (
        <View style={styles.unratedBanner}>
          <Ionicons name="star-outline" size={12} color="#D97706" />
          <Text style={styles.unratedBannerText}>À évaluer — notez ce client</Text>
        </View>
      )}

      {/* Card header */}
      <View style={styles.cardHeader}>
        <Avatar initials={initials} />
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.clientName}>
            {client.firstName} {client.lastName}
          </Text>
          <Text style={styles.propertyName}>{property.name}</Text>
          <Text style={styles.propertyCity}>{property.city}</Text>
        </View>
        <View style={styles.cardHeaderBadges}>
          <StatusBadge status={booking.status} />
          <View style={{ height: 4 }} />
          <PaymentBadge option={booking.paymentOption} />
        </View>
      </View>

      {/* Dates + guests */}
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {booking.guests} voyageur{booking.guests > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={14} color="#1056E0" />
          <Text style={[styles.detailText, { color: '#1056E0', fontWeight: '600' }]}>
            {formatAmount(booking.totalAmount)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {tab === 'pending' && (
        <View style={styles.cardActions}>
          <ActionButton
            label="Accepter"
            color="#1056E0"
            loading={loadingAction === 'accept'}
            onPress={handleAccept}
            icon="checkmark-circle-outline"
          />
          <ActionButton
            label="Refuser"
            color="#DC2626"
            loading={loadingAction === 'refuse'}
            onPress={handleRefuse}
            icon="close-circle-outline"
          />
          <ActionButton
            label="Contacter"
            color="#2563EB"
            loading={false}
            onPress={handleContact}
            icon="chatbubble-outline"
          />
        </View>
      )}

      {tab === 'confirmed' && (
        <View style={styles.cardActions}>
          {booking.paymentOption === 'full_cash' && !booking.cashReceived && (
            <ActionButton
              label="✓ Cash reçu"
              color="#065F46"
              loading={loadingAction === 'cash'}
              onPress={handleMarkCash}
              icon="wallet-outline"
            />
          )}
          <ActionButton
            label="Annuler"
            color="#DC2626"
            loading={loadingAction === 'cancel'}
            onPress={handleCancelConfirmed}
            icon="close-circle-outline"
          />
          <ActionButton
            label="Signaler"
            color="#D97706"
            loading={false}
            onPress={handleReport}
            icon="flag-outline"
          />
        </View>
      )}

      {/* Client profile panel (pending tab) */}
      {tab === 'pending' && (
        <TouchableOpacity
          style={styles.profileToggle}
          onPress={(e) => { e.stopPropagation?.(); handleToggleProfile(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle-outline" size={14} color="#2563EB" />
          <Text style={styles.profileToggleText}>
            {profileExpanded ? 'Masquer le profil' : 'Voir le profil client'}
          </Text>
          {profileLoading && <ActivityIndicator size="small" color="#2563EB" />}
          {!profileLoading && (
            <Ionicons
              name={profileExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color="#2563EB"
            />
          )}
        </TouchableOpacity>
      )}

      {tab === 'pending' && profileExpanded && (
        <View style={styles.profilePanel}>
          {clientProfile && clientProfile.totalRatings > 0 ? (
            <>
              <View style={styles.profilePanelHeader}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.profilePanelAvg}>{clientProfile.overallAvg.toFixed(1)}</Text>
                <Text style={styles.profilePanelCount}>
                  ({clientProfile.totalRatings} évaluation{clientProfile.totalRatings > 1 ? 's' : ''})
                </Text>
              </View>
              {[
                { label: 'Respect des lieux', v: clientProfile.avgRespect },
                { label: 'Communication',      v: clientProfile.avgCommunication },
                { label: 'Ponctualité',        v: clientProfile.avgPunctuality },
                { label: 'Règles',             v: clientProfile.avgRules },
              ].map(({ label, v }) => (
                <View key={label} style={styles.profileBarRow}>
                  <Text style={styles.profileBarLabel}>{label}</Text>
                  <View style={styles.profileBarTrack}>
                    <View style={[styles.profileBarFill, { width: `${(v / 5) * 100}%` as any }]} />
                  </View>
                  <Text style={styles.profileBarVal}>{v.toFixed(1)}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.profileNoData}>
              {clientProfile ? 'Nouveau client — aucune évaluation disponible.' : 'Profil indisponible.'}
            </Text>
          )}
        </View>
      )}

      {/* Report a problem → open a dispute */}
      <Modal visible={reportVisible} transparent animationType="slide" onRequestClose={() => setReportVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Signaler un problème</Text>
            <Text style={styles.modalSub}>
              Réservation de {client.firstName} {client.lastName} — {property.name}
            </Text>

            <Text style={styles.modalLabel}>Motif</Text>
            <View style={styles.reasonRow}>
              {DISPUTE_REASONS.map(r => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.reasonChip, reportReason === r.key && styles.reasonChipActive]}
                  onPress={() => setReportReason(r.key)}
                >
                  <Text style={[styles.reasonChipText, reportReason === r.key && styles.reasonChipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Description (min. 20 caractères)</Text>
            <TextInput
              style={styles.modalInput}
              value={reportText}
              onChangeText={setReportText}
              placeholder="Décrivez le problème rencontré…"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setReportVisible(false)} disabled={reportSubmitting}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, reportSubmitting && { opacity: 0.6 }]} onPress={submitReport} disabled={reportSubmitting}>
                {reportSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Envoyer le signalement</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

// ─── Action button helper ─────────────────────────────────────────────────────

interface ActionButtonProps {
  label: string;
  color: string;
  loading: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}

function ActionButton({ label, color, loading, onPress, icon }: ActionButtonProps) {
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

// ─── Main screen ──────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending',   label: 'En attente' },
  { key: 'confirmed', label: 'Confirmées' },
  { key: 'history',   label: 'Historique' },
];

export default function BookingsScreen() {
  const theme = useProTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [bookings, setBookings] = useState<Record<TabKey, Booking[]>>({
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
  const [ratedBookingIds, setRatedBookingIds] = useState<Set<string>>(new Set());

  const fetchTab = useCallback(async (tab: TabKey, silent = false) => {
    if (!silent) {
      setLoading((prev: Record<TabKey, boolean>) => ({ ...prev, [tab]: true }));
    }

    let params: Record<string, unknown>;
    if (tab === 'pending') {
      params = { status: 'pending', role: 'host' };
    } else if (tab === 'confirmed') {
      params = { status: 'confirmed', role: 'host' };
    } else {
      params = { status: 'completed,cancelled', role: 'host' };
    }

    try {
      const res = await bookingsApi.getMyBookings(params);
      const data: Booking[] = (res.data?.data ?? res.data) ?? [];
      setBookings((prev: Record<TabKey, Booking[]>) => ({ ...prev, [tab]: data }));
    } catch {
      // Keep previous data on error
    } finally {
      setLoading((prev: Record<TabKey, boolean>) => ({ ...prev, [tab]: false }));
    }
  }, []);

  const fetchAll = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      await Promise.allSettled([
        ...TABS.map((t) => fetchTab(t.key, silent)),
        clientRatingsApi.listGiven()
          .then(res => {
            const given: Array<{ bookingId: string }> = res.data?.data ?? res.data ?? [];
            setRatedBookingIds(new Set(given.map(g => g.bookingId)));
          })
          .catch(() => null),
      ]);
      if (silent) setRefreshing(false);
    },
    [fetchTab],
  );

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  const handleRefresh = useCallback(() => {
    fetchAll(true);
  }, [fetchAll]);

  const handleTabRefresh = useCallback(() => {
    fetchTab(activeTab, true);
  }, [activeTab, fetchTab]);

  const isLoading = loading[activeTab];
  const currentBookings = bookings[activeTab];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Réservations</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && { ...styles.tabItemActive, borderBottomColor: theme.primary }]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && { ...styles.tabLabelActive, color: theme.primary },
              ]}
            >
              {tab.label}
            </Text>
            {bookings[tab.key].length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === tab.key && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === tab.key && styles.tabBadgeTextActive,
                  ]}
                >
                  {bookings[tab.key].length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
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
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        >
          {currentBookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Aucune réservation</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'pending'
                  ? 'Vous n\'avez aucune demande en attente.'
                  : activeTab === 'confirmed'
                  ? 'Aucune réservation confirmée pour le moment.'
                  : 'Votre historique de réservations apparaîtra ici.'}
              </Text>
            </View>
          ) : (
            currentBookings.map((booking: Booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                tab={activeTab}
                onRefresh={handleTabRefresh}
                isRated={ratedBookingIds.has(booking.id)}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#1056E0',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: '#1056E0',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBadgeTextActive: {
    color: '#1056E0',
  },

  // Lists
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
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
    marginBottom: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  propertyName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginTop: 2,
  },
  propertyCity: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  cardHeaderBadges: {
    alignItems: 'flex-end',
  },

  // Detail rows
  cardDetails: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Actions
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 90,
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Avatar
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },

  // Unrated banner
  unratedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  unratedBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },

  // Client profile panel
  profileToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  profileToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    flex: 1,
  },
  profilePanel: {
    marginTop: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  profilePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  profilePanelAvg: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  profilePanelCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  profileBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileBarLabel: {
    fontSize: 11,
    color: '#6B7280',
    width: 100,
  },
  profileBarTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#DBEAFE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  profileBarFill: {
    height: 5,
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  profileBarVal: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
  },
  profileNoData: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Report / dispute modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalSub: { fontSize: 13, color: '#6B7280', marginTop: 2, marginBottom: 14 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  reasonChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  reasonChipActive: { borderColor: '#1056E0', backgroundColor: '#EFF5FF' },
  reasonChipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  reasonChipTextActive: { color: '#1056E0', fontWeight: '700' },
  modalInput: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', minHeight: 90, textAlignVertical: 'top', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#374151', fontWeight: '700' },
  modalConfirm: { flex: 2, backgroundColor: '#DC2626', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
