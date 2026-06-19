import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../../navigation/types';
import { bookingsApi } from '../../../services/api/endpoints/bookings';
import { BookingInvoiceDownload } from '../../../components/booking/BookingInvoiceDownload';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

type BookingStatus =
  | 'pending_payment' | 'confirmed'
  | 'cancelled_by_client' | 'cancelled_by_professional'
  | 'completed';

type PaymentOption = 'full_online' | 'ten_percent_online' | 'zero_online';

interface BookingDetail {
  id: string;
  startDate: string;
  endDate: string;
  guests: number;
  totalAmount: number;
  onlinePaidAmount: number;
  remainingCashAmount: number;
  paymentOption: PaymentOption;
  status: BookingStatus;
  specialRequests?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  property: {
    id: string;
    title: string;
    city: string;
    propertyType?: string;
    street?: string | null;
    media: Array<{ url: string; isPrimary?: boolean }>;
    owner: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string | null;
    };
  };
  transactions: Array<{
    id: string;
    amount: number;
    status: string;
    type: string;
  }>;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: 'En attente de paiement',
  confirmed: 'Confirmée',
  cancelled_by_client: 'Annulée par vous',
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

const PAYMENT_OPTION_LABELS: Record<PaymentOption, string> = {
  full_online: '100% en ligne',
  ten_percent_online: '10% en ligne + 90% sur place',
  zero_online: '100% sur place (cash)',
};
const PAYMENT_OPTION_LABELS_RESTAURANT: Record<PaymentOption, string> = {
  full_online: 'Gratuit',
  ten_percent_online: 'Gratuit',
  zero_online: 'Gratuit — aucun prépaiement',
};

const fmt = (n?: number | null) => (n ?? 0).toLocaleString('fr-CI') + ' FCFA';
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' });
}
function countNights(s: string, e: string) {
  return Math.max(1, Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86_400_000));
}
function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}
function refundPolicy(days: number): { label: string; percent: number } {
  if (days >= 7) return { label: 'Remboursement intégral (100%)', percent: 100 };
  if (days >= 3) return { label: 'Remboursement partiel (50%)', percent: 50 };
  return { label: 'Aucun remboursement', percent: 0 };
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────
function CancelModal({
  visible,
  booking,
  onClose,
  onCancelled,
}: {
  visible: boolean;
  booking: BookingDetail;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const days = daysUntil(booking.startDate);
  const { label: policyLabel, percent } = refundPolicy(days);
  const refundAmount = Math.floor(booking.onlinePaidAmount * percent / 100);

  const handleConfirm = async () => {
    if (reason.trim().length < 5) {
      Alert.alert('Motif requis', 'Veuillez indiquer un motif d\'annulation (minimum 5 caractères).');
      return;
    }
    setIsLoading(true);
    try {
      await bookingsApi.cancel(booking.id, reason.trim());
      onCancelled();
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Impossible d\'annuler. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modal.safe}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose}><Text style={modal.cancel}>Fermer</Text></TouchableOpacity>
          <Text style={modal.title}>Annuler la réservation</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={modal.body} contentContainerStyle={{ gap: 20, paddingBottom: 40 }}>
          {/* Policy */}
          <View style={modal.policyBox}>
            <Text style={modal.policyTitle}>📋 Politique d'annulation</Text>
            <View style={modal.policyRow}>
              <Text style={modal.policyLabel}>Jours avant l'arrivée</Text>
              <Text style={modal.policyVal}>{days > 0 ? `${days} jour${days > 1 ? 's' : ''}` : 'Passé'}</Text>
            </View>
            <View style={modal.policyRow}>
              <Text style={modal.policyLabel}>Politique applicable</Text>
              <Text style={[modal.policyVal, { color: percent === 100 ? '#1056E0' : percent === 50 ? '#D97706' : '#DC2626' }]}>
                {policyLabel}
              </Text>
            </View>
            {booking.onlinePaidAmount > 0 && (
              <View style={modal.policyRow}>
                <Text style={modal.policyLabel}>Montant remboursé</Text>
                <Text style={[modal.policyVal, { fontWeight: '700', color: refundAmount > 0 ? '#1056E0' : '#DC2626' }]}>
                  {fmt(refundAmount)}
                </Text>
              </View>
            )}
          </View>

          {/* Reason */}
          <View>
            <Text style={modal.label}>Motif de l'annulation *</Text>
            <TextInput
              style={modal.input}
              placeholder="Expliquez brièvement la raison de votre annulation…"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
              textAlignVertical="top"
            />
            <Text style={modal.charCount}>{reason.length}/500</Text>
          </View>

          <View style={modal.warning}>
            <Text style={modal.warningText}>
              ⚠️ Cette action est irréversible. Votre réservation sera définitivement annulée.
            </Text>
          </View>
        </ScrollView>

        <View style={modal.footer}>
          <TouchableOpacity style={modal.cancelBtn} onPress={handleConfirm} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={modal.cancelBtnText}>Confirmer l'annulation</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export function BookingDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { bookingId } = (route.params ?? {}) as { bookingId?: string };

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      setError('Réservation introuvable.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingsApi.getById(bookingId);
      const data = res?.data;
      const b: BookingDetail = data?.booking ?? data?.data?.booking ?? data?.data ?? data;
      // Validation de forme : un objet sans id n'est pas une réservation —
      // évite les crashs sur booking.property.* en rendu.
      if (!b || typeof b !== 'object' || !b.id) {
        setError('Réponse inattendue du serveur.');
        return;
      }
      setBooking(b);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Impossible de charger la réservation.');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator size="large" color="#1056E0" /></View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error ?? 'Réservation introuvable.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBooking}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const nights = countNights(booking.startDate, booking.endDate);
  const imageUrl = booking.property?.media?.find(m => m.isPrimary)?.url ?? booking.property?.media?.[0]?.url;
  const isConfirmedOrDone = booking.status === 'confirmed' || booking.status === 'completed';
  const isDone = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled_by_client' || booking.status === 'cancelled_by_professional';
  const canCancel = (booking.status === 'confirmed' || booking.status === 'pending_payment') && daysUntil(booking.startDate) > 0;
  const canReview = isDone && new Date() > new Date(booking.endDate);
  const hasCashBalance = booking.remainingCashAmount > 0 && !isDone && !isCancelled;
  const ref = '#' + String(booking.id ?? "").slice(0, 8).toUpperCase();
  const isRestaurant = booking.property?.propertyType === 'restaurant';
  const reservationTime = isRestaurant
    ? (booking.specialRequests?.match(/à (\d{2}:\d{2})/)?.[1] ?? null)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail de la réservation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Property image */}
        {imageUrl
          ? <Image source={{ uri: imageUrl }} style={styles.heroImage} />
          : <View style={[styles.heroImage, styles.heroFallback]}>
              <Text style={styles.heroEmoji}>{isRestaurant ? '🍽️' : '🏠'}</Text>
            </View>}

        {/* Status + title */}
        <View style={styles.titleBlock}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[booking.status] + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[booking.status] }]} />
            <Text style={[styles.statusText, { color: STATUS_COLORS[booking.status] }]}>
              {STATUS_LABELS[booking.status]}
            </Text>
          </View>
          <Text style={styles.propertyName}>{booking.property?.title ?? "Votre réservation"}</Text>
          <Text style={styles.city}>📍 {booking.property?.city ?? "—"}</Text>
          <Text style={styles.ref}>{ref}</Text>
        </View>

        {/* Cash balance reminder — persistent and prominent */}
        {hasCashBalance && (
          <View style={styles.cashBanner}>
            <View style={styles.cashBannerLeft}>
              <Text style={styles.cashBannerIcon}>💵</Text>
              <View>
                <Text style={styles.cashBannerTitle}>Solde à régler sur place</Text>
                <Text style={styles.cashBannerSub}>
                  {booking.paymentOption === 'ten_percent_online'
                    ? 'À payer à votre arrivée (90% restant)'
                    : 'Paiement intégral en espèces à l\'arrivée'}
                </Text>
              </View>
            </View>
            <Text style={styles.cashBannerAmount}>{fmt(booking.remainingCashAmount)}</Text>
          </View>
        )}

        {/* Booking info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isRestaurant ? 'Détails de la réservation' : 'Détails du séjour'}</Text>
          <View style={styles.infoGrid}>
            {isRestaurant ? (
              <>
                <InfoRow label="Date" value={fmtDate(booking.startDate)} />
                {reservationTime && <InfoRow label="Heure" value={reservationTime} />}
                <InfoRow label="Couverts" value={`${booking.guests} couvert${booking.guests > 1 ? 's' : ''}`} />
              </>
            ) : (
              <>
                <InfoRow label="Arrivée" value={fmtDate(booking.startDate)} />
                <InfoRow label="Départ" value={fmtDate(booking.endDate)} />
                <InfoRow label="Durée" value={`${nights} nuit${nights > 1 ? 's' : ''}`} />
                <InfoRow label="Voyageurs" value={`${booking.guests} personne${booking.guests > 1 ? 's' : ''}`} />
              </>
            )}
          </View>
        </View>

        {/* Payment summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paiement</Text>
          <View style={styles.paymentCard}>
            <PayRow
              label="Mode de paiement"
              value={isRestaurant ? PAYMENT_OPTION_LABELS_RESTAURANT[booking.paymentOption] : PAYMENT_OPTION_LABELS[booking.paymentOption]}
            />
            <PayRow label="Montant total" value={isRestaurant ? 'Gratuit' : fmt(booking.totalAmount)} bold />
            {booking.onlinePaidAmount > 0 && (
              <PayRow
                label="Payé en ligne"
                value={fmt(booking.onlinePaidAmount)}
                valueColor="#1056E0"
              />
            )}
            {booking.remainingCashAmount > 0 && (
              <PayRow
                label={isDone ? 'Réglé sur place' : 'Restant à payer'}
                value={fmt(booking.remainingCashAmount)}
                valueColor={isDone ? '#1056E0' : '#D97706'}
              />
            )}
          </View>
        </View>

        {/* Address — only when confirmed or completed */}
        {isConfirmedOrDone && booking.property?.street && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse exacte</Text>
            <View style={styles.addressCard}>
              <Text style={styles.addressText}>
                📍 {booking.property?.street}, {booking.property?.city}
              </Text>
            </View>
          </View>
        )}

        {/* Instructions — shown when confirmed */}
        {booking.status === 'confirmed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isRestaurant ? 'Votre réservation' : 'Instructions d\'arrivée'}</Text>
            <View style={styles.instructionsCard}>
              {isRestaurant ? (
                <>
                  <Text style={styles.instructionLine}>✅ Votre table est confirmée. Présentez-vous à l'heure réservée.</Text>
                  <Text style={styles.instructionLine}>📞 En cas d'imprévu, prévenez le restaurant via la messagerie.</Text>
                  <Text style={styles.instructionLine}>🍽️ Aucun prépaiement requis — règlement sur place si applicable.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.instructionLine}>🔑 Contactez l'hôte pour les modalités de remise des clés.</Text>
                  <Text style={styles.instructionLine}>🕐 Horaires habituels : arrivée à partir de 14h, départ avant 12h.</Text>
                  <Text style={styles.instructionLine}>📞 En cas de retard, prévenez l'hôte via la messagerie.</Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Host contact — only if confirmed or completed */}
        {isConfirmedOrDone && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isRestaurant ? 'Contact du restaurant' : 'Coordonnées de l\'hôte'}</Text>
            <View style={styles.hostCard}>
              {booking.property?.owner?.avatarUrl
                ? <Image source={{ uri: booking.property?.owner?.avatarUrl }} style={styles.hostAvatar} />
                : (
                  <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
                    <Text style={styles.hostInitial}>
                      {(booking.property?.owner?.firstName?.[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                )}
              <View style={styles.hostInfo}>
                <Text style={styles.hostName}>
                  {booking.property?.owner?.firstName} {booking.property?.owner?.lastName}
                </Text>
                <Text style={styles.hostLabel}>{isRestaurant ? 'Responsable du restaurant' : 'Hôte de la propriété'}</Text>
              </View>
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => navigation.navigate('Chat', {
                  bookingId: booking.id,
                  recipientName: `${booking.property?.owner?.firstName} ${booking.property?.owner?.lastName}`,
                })}
              >
                <Text style={styles.messageBtnText}>💬 Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Special requests */}
        {booking.specialRequests && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Demandes spéciales</Text>
            <View style={styles.specialCard}>
              <Text style={styles.specialText}>{booking.specialRequests}</Text>
            </View>
          </View>
        )}

        {/* Invoice */}
        {isConfirmedOrDone && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Facture</Text>
            <BookingInvoiceDownload bookingId={booking.id} />
          </View>
        )}

        {/* Cancellation info */}
        {isCancelled && (
          <View style={styles.section}>
            <View style={styles.cancelledCard}>
              <Text style={styles.cancelledTitle}>Réservation annulée</Text>
              {booking.cancellationReason && (
                <Text style={styles.cancelledReason}>Motif : {booking.cancellationReason}</Text>
              )}
              {booking.cancelledAt && (
                <Text style={styles.cancelledDate}>
                  Le {fmtDate(booking.cancelledAt)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {canReview && (
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => navigation.navigate('WriteReview', { bookingId: booking.id, propertyId: booking.property?.id ?? "" })}
            >
              <Text style={styles.reviewBtnIcon}>⭐</Text>
              <Text style={styles.reviewBtnText}>Laisser un avis</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCancelModal(true)}>
              <Text style={styles.cancelBtnText}>Annuler la réservation</Text>
            </TouchableOpacity>
          )}
          {isConfirmedOrDone && (
            <TouchableOpacity
              style={styles.disputeBtn}
              onPress={() => navigation.navigate('NewDispute', { bookingId: booking.id })}
            >
              <Text style={styles.disputeBtnText}>⚖️ Signaler un problème</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {booking && (
        <CancelModal
          visible={showCancelModal}
          booking={booking}
          onClose={() => setShowCancelModal(false)}
          onCancelled={() => {
            setShowCancelModal(false);
            fetchBooking();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PayRow({ label, value, bold, valueColor }: { label: string; value: string; bold?: boolean; valueColor?: string }) {
  return (
    <View style={styles.payRow}>
      <Text style={styles.payLabel}>{label}</Text>
      <Text style={[styles.payValue, bold && styles.payValueBold, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorIcon: { fontSize: 48 },
  errorText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  retryBtn: { backgroundColor: '#1056E0', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, backgroundColor: '#808080',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E2E6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 8, zIndex: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 26, color: '#111111', fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#111111', textAlign: 'center' },

  scrollContent: { paddingBottom: 16 },
  heroImage: { width: '100%', height: 220 },
  heroFallback: { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  heroEmoji: { fontSize: 52 },

  // Title block
  titleBlock: { padding: 16, gap: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  propertyName: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 4 },
  city: { fontSize: 13, color: '#6B7280' },
  ref: { fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' },

  // Cash banner
  cashBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: '#FDE68A' },
  cashBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cashBannerIcon: { fontSize: 22 },
  cashBannerTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  cashBannerSub: { fontSize: 11, color: '#B45309', marginTop: 2 },
  cashBannerAmount: { fontSize: 16, fontWeight: '800', color: '#92400E' },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },

  // Info grid
  infoGrid: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#111827' },

  // Payment card
  paymentCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, gap: 10 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  payValue: { fontSize: 13, color: '#111827' },
  payValueBold: { fontWeight: '700', fontSize: 14 },

  // Address
  addressCard: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14 },
  addressText: { fontSize: 14, color: '#166534', fontWeight: '500', lineHeight: 20 },

  // Instructions
  instructionsCard: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, gap: 8 },
  instructionLine: { fontSize: 13, color: '#1E40AF', lineHeight: 20 },

  // Host card
  hostCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 },
  hostAvatar: { width: 46, height: 46, borderRadius: 23 },
  hostAvatarFallback: { backgroundColor: '#1056E0', justifyContent: 'center', alignItems: 'center' },
  hostInitial: { color: '#fff', fontSize: 18, fontWeight: '700' },
  hostInfo: { flex: 1 },
  hostName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  hostLabel: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  messageBtn: { backgroundColor: '#1056E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  messageBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Special requests
  specialCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 },
  specialText: { fontSize: 13, color: '#374151', lineHeight: 20 },

  // Cancelled
  cancelledCard: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, gap: 6, borderWidth: 1, borderColor: '#FECACA' },
  cancelledTitle: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  cancelledReason: { fontSize: 13, color: '#374151', lineHeight: 19 },
  cancelledDate: { fontSize: 12, color: '#9CA3AF' },

  // Actions
  actions: { paddingHorizontal: 16, gap: 10 },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1056E0', borderRadius: 14, paddingVertical: 14,
  },
  reviewBtnIcon: { fontSize: 18 },
  reviewBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: {
    borderWidth: 1.5, borderColor: '#DC2626',
    borderRadius: 14, paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
  disputeBtn: {
    borderWidth: 1.5, borderColor: '#9CA3AF',
    borderRadius: 14, paddingVertical: 13, alignItems: 'center',
  },
  disputeBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
});

// ─── Cancel Modal Styles ───────────────────────────────────────────────────────
const modal = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  cancel: { fontSize: 15, color: '#6B7280', width: 60 },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  body: { flex: 1, padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },

  policyBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, gap: 10 },
  policyTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  policyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  policyLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  policyVal: { fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'right', flex: 1 },

  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', minHeight: 100, backgroundColor: '#F9FAFB' },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },

  warning: { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  warningText: { fontSize: 13, color: '#92400E', lineHeight: 19 },

  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  cancelBtn: { backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
