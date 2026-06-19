import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { bookingsApi } from '../../../services/api/endpoints/bookings';
import { clientRatingsApi } from '../../../services/api/endpoints/clientRatings';
import { useProTheme } from '../../../hooks/useProTheme';

// The backend uses these status values
type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled_by_client'
  | 'cancelled_by_professional'
  | 'cancelled'; // fallback

interface Booking {
  id: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  paymentOption: 'full_online' | 'ten_percent_online' | 'zero_online' | 'full_cash';
  cashReceived?: boolean;
  invoiceUrl?: string;
  property: { id: string; name: string; city: string };
  client: { id: string; firstName: string; lastName: string; phone?: string; email?: string };
  createdAt: string;
  promoCode?: string;
  cancellationReason?: string;
}

interface ClientAggregate {
  avgRespect: number;
  avgCommunication: number;
  avgPunctuality: number;
  avgRules: number;
  overallAvg: number;
  totalRatings: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function nightCount(checkIn: string, checkOut: string): number {
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000);
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.ratingBarRow}>
      <Text style={styles.ratingBarLabel}>{label}</Text>
      <View style={styles.ratingBarTrack}>
        <View style={[styles.ratingBarFill, { width: `${(value / 5) * 100}%` as any }]} />
      </View>
      <Text style={styles.ratingBarValue}>{value.toFixed(1)}</Text>
    </View>
  );
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending_payment:           { bg: '#FEF3C7', text: '#D97706' },
  confirmed:                 { bg: '#D1FAE5', text: '#065F46' },
  completed:                 { bg: '#F3F4F6', text: '#6B7280' },
  cancelled_by_client:       { bg: '#FEE2E2', text: '#DC2626' },
  cancelled_by_professional: { bg: '#FEE2E2', text: '#DC2626' },
  cancelled:                 { bg: '#FEE2E2', text: '#DC2626' },
};
const STATUS_LABEL: Record<string, string> = {
  pending_payment:           'En attente de confirmation',
  confirmed:                 'Confirmée',
  completed:                 'Terminée',
  cancelled_by_client:       'Annulée par le client',
  cancelled_by_professional: 'Refusée',
  cancelled:                 'Annulée',
};

export default function BookingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { bookingId = '' } = (route.params ?? {}) as { bookingId?: string };
  const theme = useProTheme();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [clientAggregate, setClientAggregate] = useState<ClientAggregate | null>(null);
  const [canRateData, setCanRateData] = useState<{ canRate: boolean; alreadyRated: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.getById(bookingId);
      const b: Booking = res.data?.data ?? res.data;
      setBooking(b);

      const [aggRes, canRateRes] = await Promise.allSettled([
        clientRatingsApi.getClientAggregate(b.client.id),
        clientRatingsApi.canRate(bookingId),
      ]);
      if (aggRes.status === 'fulfilled') {
        setClientAggregate(aggRes.value.data?.data ?? aggRes.value.data);
      }
      if (canRateRes.status === 'fulfilled') {
        setCanRateData(canRateRes.value.data?.data ?? canRateRes.value.data);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la réservation.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigation]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = () => {
    Alert.alert(
      'Confirmer la réservation',
      'Accepter cette réservation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setActionLoading('confirm');
            try {
              await bookingsApi.confirm(bookingId);
              load();
            } catch (e: any) {
              Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de confirmer.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Refuser la réservation',
      'Refuser cette réservation ? Le client sera notifié.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('reject');
            try {
              await bookingsApi.cancel(bookingId, 'Refusé par le professionnel');
              load();
            } catch (e: any) {
              Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de refuser.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleCancelBooking = () => {
    Alert.alert('Annuler la réservation', 'Annuler cette réservation confirmée ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Annuler', style: 'destructive',
        onPress: async () => {
          setActionLoading('cancel');
          try {
            await bookingsApi.cancel(bookingId, 'Annulation par le professionnel');
            load();
          } catch (e: any) {
            Alert.alert('Erreur', e?.response?.data?.message ?? "Impossible d'annuler.");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleMarkCash = async () => {
    setActionLoading('cash');
    try {
      await bookingsApi.markCashReceived(bookingId);
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible de marquer le paiement.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadInvoice = async () => {
    setActionLoading('invoice');
    try {
      const res = await bookingsApi.getInvoice(bookingId);
      const url: string = res.data?.data?.invoiceUrl ?? res.data?.invoiceUrl ?? res.data?.url ?? booking?.invoiceUrl;
      if (url) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Facture', 'La facture sera disponible sous 24h après le séjour.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de télécharger la facture.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!booking) return null;

  const nights = nightCount(booking.checkIn, booking.checkOut);
  const isPending  = booking.status === 'pending_payment';
  const isConfirmed = booking.status === 'confirmed';
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status.startsWith('cancelled') || booking.status === 'cancelled_by_professional';
  const canRate = canRateData?.canRate ?? false;
  const alreadyRated = canRateData?.alreadyRated ?? false;

  const statusColor = STATUS_COLOR[booking.status] ?? STATUS_COLOR['cancelled'];
  const statusLabel = STATUS_LABEL[booking.status] ?? booking.status;

  const initials = `${booking.client?.firstName?.[0] ?? '?'}${booking.client?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Status + ref */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>{statusLabel}</Text>
            </View>
            <Text style={styles.bookingRef}>#{String(bookingId ?? '').slice(-8).toUpperCase()}</Text>
          </View>
          <Text style={styles.createdAt}>Créée le {formatDate(booking.createdAt)}</Text>
        </View>

        {/* ── Accept / Reject actions (pending) ── */}
        {isPending && (
          <View style={[styles.card, styles.actionCard]}>
            <Text style={styles.cardTitle}>Action requise</Text>
            <Text style={styles.actionHint}>Cette réservation attend votre confirmation.</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtnHalf, { backgroundColor: '#065F46' }]}
                onPress={handleConfirm}
                disabled={actionLoading === 'confirm'}
                accessibilityRole="button"
                accessibilityLabel="Accepter la réservation"
              >
                {actionLoading === 'confirm'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Accepter</Text>
                    </>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnHalf, { backgroundColor: '#DC2626' }]}
                onPress={handleReject}
                disabled={actionLoading === 'reject'}
                accessibilityRole="button"
                accessibilityLabel="Refuser la réservation"
              >
                {actionLoading === 'reject'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="close-circle" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Refuser</Text>
                    </>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Client info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client</Text>
          <View style={styles.clientRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{booking.client.firstName} {booking.client.lastName}</Text>
              {booking.client.phone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${booking.client.phone}`)} accessibilityRole="button" accessibilityLabel={`Appeler ${booking.client.phone}`}>
                  <Text style={[styles.clientDetail, { color: theme.primary }]}>📞 {booking.client.phone}</Text>
                </TouchableOpacity>
              )}
              {booking.client.email && (
                <Text style={styles.clientDetail}>✉️ {booking.client.email}</Text>
              )}
            </View>
          </View>

          {clientAggregate && clientAggregate.totalRatings > 0 && (
            <View style={styles.aggregateBox}>
              <View style={styles.aggregateHeader}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.aggregateAvg}>{clientAggregate.overallAvg.toFixed(1)}</Text>
                <Text style={styles.aggregateCount}>({clientAggregate.totalRatings} évaluation{clientAggregate.totalRatings > 1 ? 's' : ''})</Text>
              </View>
              <RatingBar label="Respect des lieux"  value={clientAggregate.avgRespect} />
              <RatingBar label="Communication"       value={clientAggregate.avgCommunication} />
              <RatingBar label="Ponctualité"         value={clientAggregate.avgPunctuality} />
              <RatingBar label="Règles de la maison" value={clientAggregate.avgRules} />
            </View>
          )}
          {clientAggregate && clientAggregate.totalRatings === 0 && (
            <Text style={styles.noRatingText}>Aucune évaluation disponible pour ce client.</Text>
          )}
        </View>

        {/* Séjour */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Séjour — {booking.property.name}</Text>
          <Text style={styles.cardSubtitle}>{booking.property.city}</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailItemLabel}>Arrivée</Text>
              <Text style={styles.detailItemValue}>{formatDate(booking.checkIn)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailItemLabel}>Départ</Text>
              <Text style={styles.detailItemValue}>{formatDate(booking.checkOut)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailItemLabel}>Nuits</Text>
              <Text style={styles.detailItemValue}>{nights}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailItemLabel}>Voyageurs</Text>
              <Text style={styles.detailItemValue}>{booking.guests}</Text>
            </View>
          </View>
        </View>

        {/* Paiement */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Paiement</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Mode</Text>
            <Text style={styles.paymentValue}>
              {booking.paymentOption === 'full_cash' ? 'Espèces (100%)' :
               booking.paymentOption === 'full_online' ? 'En ligne (100%)' :
               booking.paymentOption === 'zero_online' ? 'Gratuit' : 'En ligne (10%) + Cash'}
            </Text>
          </View>
          {(booking.paymentOption === 'full_cash' || booking.paymentOption === 'ten_percent_online') && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Cash reçu</Text>
              <View style={[styles.statusBadge, { backgroundColor: booking.cashReceived ? '#D1FAE5' : '#FEF3C7' }]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: booking.cashReceived ? '#065F46' : '#D97706' }}>
                  {booking.cashReceived ? '✓ Confirmé' : 'En attente'}
                </Text>
              </View>
            </View>
          )}
          <View style={[styles.paymentRow, styles.paymentTotal]}>
            <Text style={styles.paymentTotalLabel}>Total</Text>
            <Text style={[styles.paymentTotalValue, { color: theme.primary }]}>
              {(booking.totalAmount ?? 0).toLocaleString('fr-CI')} FCFA
            </Text>
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actionsCard}>
          {/* Mark cash received */}
          {isConfirmed && (booking.paymentOption === 'full_cash' || booking.paymentOption === 'ten_percent_online') && !booking.cashReceived && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#065F46' }]}
              onPress={handleMarkCash}
              disabled={actionLoading === 'cash'}
              accessibilityRole="button"
              accessibilityLabel="Marquer le paiement en espèces comme reçu"
            >
              {actionLoading === 'cash'
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="wallet-outline" size={16} color="#fff" /><Text style={styles.actionBtnText}>Marquer paiement cash reçu</Text></>}
            </TouchableOpacity>
          )}

          {/* Download invoice */}
          {(isConfirmed || isCompleted) && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.primary }]}
              onPress={handleDownloadInvoice}
              disabled={actionLoading === 'invoice'}
              accessibilityRole="button"
              accessibilityLabel="Télécharger la facture"
            >
              {actionLoading === 'invoice'
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="download-outline" size={16} color="#fff" /><Text style={styles.actionBtnText}>Télécharger la facture</Text></>}
            </TouchableOpacity>
          )}

          {/* Cancel confirmed booking */}
          {isConfirmed && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
              onPress={handleCancelBooking}
              disabled={actionLoading === 'cancel'}
              accessibilityRole="button"
              accessibilityLabel="Annuler la réservation"
            >
              {actionLoading === 'cancel'
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="close-circle-outline" size={16} color="#fff" /><Text style={styles.actionBtnText}>Annuler la réservation</Text></>}
            </TouchableOpacity>
          )}

          {/* Rate client */}
          {isCompleted && canRate && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
              onPress={() => navigation.navigate('RateClient', { bookingId, clientId: booking.client.id })}
              accessibilityRole="button"
              accessibilityLabel="Évaluer ce client"
            >
              <Ionicons name="star-outline" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Évaluer ce client</Text>
            </TouchableOpacity>
          )}
          {isCompleted && alreadyRated && (
            <View style={[styles.actionBtn, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
              <Text style={[styles.actionBtnText, { color: '#374151' }]}>Client déjà évalué</Text>
            </View>
          )}

          {/* Cancellation reason */}
          {isCancelled && booking.cancellationReason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Motif d'annulation</Text>
              <Text style={styles.reasonText}>{booking.cancellationReason}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  actionCard: { borderWidth: 1, borderColor: '#FEF3C7', backgroundColor: '#FFFBEB' },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  createdAt: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  bookingRef: { fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' as any },

  actionHint: { fontSize: 13, color: '#92400E', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtnHalf: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 12,
  },

  clientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  clientInfo: { flex: 1, gap: 3 },
  clientName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  clientDetail: { fontSize: 12, color: '#6B7280' },

  aggregateBox: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, gap: 8 },
  aggregateHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  aggregateAvg: { fontSize: 16, fontWeight: '700', color: '#111827' },
  aggregateCount: { fontSize: 12, color: '#6B7280' },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingBarLabel: { fontSize: 12, color: '#6B7280', width: 130 },
  ratingBarTrack: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  ratingBarFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
  ratingBarValue: { fontSize: 12, color: '#374151', fontWeight: '600', width: 28, textAlign: 'right' },
  noRatingText: { fontSize: 12, color: '#9CA3AF', marginTop: 8, fontStyle: 'italic' },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  detailItem: { width: '45%' },
  detailItemLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  detailItemValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  paymentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  paymentLabel: { fontSize: 13, color: '#6B7280' },
  paymentValue: { fontSize: 13, fontWeight: '500', color: '#374151' },
  paymentTotal: { borderBottomWidth: 0, marginTop: 4 },
  paymentTotalLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  paymentTotalValue: { fontSize: 18, fontWeight: '800' },

  actionsCard: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 14,
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  reasonBox: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#DC2626',
  },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: '#DC2626', marginBottom: 4 },
  reasonText: { fontSize: 13, color: '#374151' },
});
