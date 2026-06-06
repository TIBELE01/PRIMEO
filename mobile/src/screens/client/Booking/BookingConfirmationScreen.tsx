import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Platform,
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Animated, Image, Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../../navigation/types';
import { bookingsApi } from '../../../services/api/endpoints/bookings';

type Props = NativeStackScreenProps<ClientStackParamList, 'BookingConfirmation'>;

type PaymentOption = 'full_online' | 'ten_percent_online' | 'zero_online';

// Phases de l'écran : vérification du paiement → succès / échec / en attente prolongée
type Phase = 'checking' | 'success' | 'failed' | 'pending_timeout';

interface BookingDetail {
  id: string;
  status: string;
  paymentOption: PaymentOption;
  totalAmount: number;
  onlinePaidAmount: number;
  remainingCashAmount: number;
  startDate: string;
  endDate: string;
  guests: number;
  specialRequests?: string | null;
  invoiceUrl?: string | null;
  property: {
    title?: string; // champ Prisma
    name?: string;  // alias de compatibilité
    propertyType?: string;
    city: string;
    images?: Array<{ url: string; isPrimary?: boolean }>;
    media?: Array<{ url: string; isPrimary?: boolean }>;
  };
}

const POLL_INTERVAL_MS = 3000;
// Sur web, l'utilisateur paie dans un onglet séparé : on passe rapidement en mode
// "vérification manuelle" (15 s) pour ne pas afficher un spinner plusieurs minutes.
// Sur native, on sonde plus longtemps car la WebView reste dans l'app.
const MAX_POLLS = Platform.OS === 'web' ? 5 : 25;

const fmt = (n: number) => n.toLocaleString('fr-CI') + ' FCFA';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-CI', { day: 'numeric', month: 'short', year: 'numeric' });
}

function countNights(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
}

function openUrl(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    Linking.openURL(url).catch(() => undefined);
  }
}

export function BookingConfirmationScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [phase, setPhase] = useState<Phase>('checking');
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pollCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const animateCheck = useCallback(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: Platform.OS !== 'web', tension: 200, friction: 6 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', tension: 300, friction: 8 }),
    ]).start();
  }, [scaleAnim]);

  const markSuccess = useCallback((b: BookingDetail | null, invUrl: string | null) => {
    if (settledRef.current) return;
    settledRef.current = true;
    clearTimer();
    if (b) setBooking(b);
    if (invUrl) setInvoiceUrl(invUrl);
    setPhase('success');
    animateCheck();
  }, [animateCheck, clearTimer]);

  const markFailed = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    clearTimer();
    setPhase('failed');
  }, [clearTimer]);

  // Récupère les détails de la réservation (pour l'affichage)
  const fetchBooking = useCallback(async (): Promise<BookingDetail | null> => {
    try {
      const res = await bookingsApi.getById(bookingId);
      const data = res?.data;
      const b: BookingDetail = data?.booking ?? data?.data?.booking ?? data?.data ?? data;
      setBooking(b);
      return b;
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Impossible de charger la réservation.');
      return null;
    }
  }, [bookingId]);

  // Sonde le statut du paiement jusqu'à résolution (succès/échec) ou expiration
  const poll = useCallback(async () => {
    if (settledRef.current) return;
    try {
      const res = await bookingsApi.getPaymentStatus(bookingId);
      const data = res?.data ?? {};
      const paymentStatus: string = data.paymentStatus ?? 'pending';
      const invUrl: string | null = data.invoiceUrl ?? null;

      if (paymentStatus === 'success') {
        const b = await fetchBooking();
        markSuccess(b, invUrl);
        return;
      }
      if (paymentStatus === 'failed') {
        markFailed();
        return;
      }
    } catch {
      // Erreur réseau transitoire — on réessaie
    }

    pollCountRef.current += 1;
    if (pollCountRef.current >= MAX_POLLS) {
      if (!settledRef.current) {
        settledRef.current = true;
        clearTimer();
        setPhase('pending_timeout');
      }
      return;
    }
    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
  }, [bookingId, fetchBooking, markSuccess, markFailed, clearTimer]);

  const startPolling = useCallback(async () => {
    settledRef.current = false;
    pollCountRef.current = 0;
    setPhase('checking');

    const b = await fetchBooking();
    // Statuts déjà terminaux (ex : cash → confirmé immédiatement)
    if (b) {
      if (b.status === 'confirmed' || b.status === 'completed') {
        markSuccess(b, b.invoiceUrl ?? null);
        return;
      }
      if (b.status === 'cancelled_by_client' || b.status === 'cancelled_by_professional') {
        markFailed();
        return;
      }
    }
    // Sinon, sonder le paiement
    poll();
  }, [fetchBooking, markSuccess, markFailed, poll]);

  useEffect(() => {
    startPolling();
    return () => clearTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleDownloadInvoice = useCallback(async () => {
    if (invoiceUrl) {
      openUrl(invoiceUrl);
      return;
    }
    setInvoiceLoading(true);
    try {
      const res = await bookingsApi.getInvoice(bookingId);
      const url = res?.data?.invoiceUrl ?? res?.data?.data?.invoiceUrl;
      if (url) {
        setInvoiceUrl(url);
        openUrl(url);
      } else {
        setError('Facture indisponible pour le moment.');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Impossible de générer la facture.');
    } finally {
      setInvoiceLoading(false);
    }
  }, [invoiceUrl, bookingId]);

  // ─── Écran de vérification (sondage en cours) ────────────────────────────────
  if (phase === 'checking') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1056E0" />
          <Text style={styles.checkingTitle}>Vérification du paiement…</Text>
          <Text style={styles.checkingBody}>
            Si une page de paiement (Wave, Orange Money…) s'est ouverte, terminez-y le paiement.
            Cette page se mettra à jour automatiquement.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Écran d'échec ───────────────────────────────────────────────────────────
  if (phase === 'failed') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <View style={styles.failCircle}>
            <Text style={styles.failMark}>✕</Text>
          </View>
          <Text style={styles.failTitle}>Paiement non abouti</Text>
          <Text style={styles.failBody}>
            Votre paiement a échoué, a été refusé ou annulé. Aucun montant n'a été débité.
            Vous pouvez réessayer la réservation.
          </Text>
          <TouchableOpacity style={styles.primaryCTA} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryCTAText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryCTA} onPress={() => navigation.navigate('MyBookings')}>
            <Text style={styles.secondaryCTAText}>Voir mes réservations</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Écran « paiement en attente » (expiration du sondage) ───────────────────
  if (phase === 'pending_timeout') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.pendingIcon}>⏳</Text>
          <Text style={styles.checkingTitle}>Paiement en attente</Text>
          <Text style={styles.checkingBody}>
            Nous n'avons pas encore reçu la confirmation de votre paiement. Si vous l'avez réglé,
            cela peut prendre quelques instants. Vous pouvez vérifier à nouveau.
          </Text>
          <TouchableOpacity style={styles.primaryCTA} onPress={startPolling}>
            <Text style={styles.primaryCTAText}>Vérifier à nouveau</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryCTA} onPress={() => navigation.navigate('MyBookings')}>
            <Text style={styles.secondaryCTAText}>Voir mes réservations</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Écran de succès ─────────────────────────────────────────────────────────
  if (!booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error ?? 'Réservation introuvable.'}</Text>
          <TouchableOpacity style={styles.primaryCTA} onPress={() => navigation.navigate('MyBookings')}>
            <Text style={styles.primaryCTAText}>Voir mes réservations</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const nights = countNights(booking.startDate, booking.endDate);
  const imageUrl = (booking.property.images ?? booking.property.media ?? []).find(i => i.isPrimary)?.url
    ?? (booking.property.images ?? booking.property.media ?? [])[0]?.url;
  const ref = '#' + booking.id.slice(0, 8).toUpperCase();
  const option = booking.paymentOption;
  const isRestaurantBooking = booking.property.propertyType === 'restaurant';
  // Extraire l'heure depuis les demandes spéciales "Réservation de table à HH:MM"
  const reservationTime = isRestaurantBooking
    ? (booking.specialRequests?.match(/à (\d{2}:\d{2})/)?.[1] ?? null)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Coche animée */}
        <View style={styles.checkWrap}>
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.checkMark}>✓</Text>
          </Animated.View>
          <Text style={styles.confirmedTitle}>Réservation confirmée !</Text>
          <Text style={styles.refText}>{ref}</Text>
        </View>

        {/* Carte propriété */}
        <View style={styles.propertyCard}>
          {imageUrl
            ? <Image source={{ uri: imageUrl }} style={styles.propertyImage} />
            : <View style={[styles.propertyImage, styles.imageFallback]}>
                <Text style={styles.imageFallbackText}>{isRestaurantBooking ? '🍽️' : '🏠'}</Text>
              </View>}
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName} numberOfLines={2}>{booking.property.title ?? booking.property.name}</Text>
            <Text style={styles.propertyCity}>📍 {booking.property.city}</Text>
            {isRestaurantBooking ? (
              <>
                <Text style={styles.bookingDates}>{fmtDate(booking.startDate)}</Text>
                <Text style={styles.bookingDetails}>
                  🍽️ {booking.guests} couvert{booking.guests > 1 ? 's' : ''}
                  {reservationTime ? ` · 🕐 ${reservationTime}` : ''}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.bookingDates}>
                  {fmtDate(booking.startDate)} → {fmtDate(booking.endDate)}
                </Text>
                <Text style={styles.bookingDetails}>
                  {nights} nuit{nights > 1 ? 's' : ''} · {booking.guests} voyageur{booking.guests > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Récapitulatif du paiement */}
        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>Récapitulatif du paiement</Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Montant total</Text>
            <Text style={styles.paymentTotal}>{fmt(booking.totalAmount)}</Text>
          </View>

          {option === 'full_online' && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payé en ligne</Text>
              <View style={styles.paidRow}>
                <Text style={styles.paidAmount}>{fmt(booking.onlinePaidAmount)}</Text>
                <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>Payé ✓</Text></View>
              </View>
            </View>
          )}

          {option === 'ten_percent_online' && (
            <>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payé en ligne (10%)</Text>
                <View style={styles.paidRow}>
                  <Text style={styles.paidAmount}>{fmt(booking.onlinePaidAmount)}</Text>
                  <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>Payé ✓</Text></View>
                </View>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>À régler sur place (90%)</Text>
                <Text style={styles.cashAmount}>{fmt(booking.remainingCashAmount)}</Text>
              </View>
            </>
          )}

          {option === 'zero_online' && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>À régler sur place (cash)</Text>
              <Text style={styles.cashAmount}>{fmt(booking.totalAmount)}</Text>
            </View>
          )}
        </View>

        {/* Restaurant gratuit : encart vert de confirmation */}
        {isRestaurantBooking && (
          <View style={styles.freeBox}>
            <Text style={styles.freeBoxText}>
              ✅ Réservation gratuite, sans prépaiement. Le restaurant vous attend à l'heure choisie.
            </Text>
          </View>
        )}
        {/* Avertissement cash pour zero_online hors restaurant */}
        {option === 'zero_online' && !isRestaurantBooking && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              L'hôte peut annuler cette réservation sans frais jusqu'à 24h avant votre arrivée si le paiement en espèces n'est pas confirmé. Assurez-vous d'apporter le montant exact.
            </Text>
          </View>
        )}

        {/* Facture */}
        <TouchableOpacity
          style={styles.invoiceBtn}
          onPress={handleDownloadInvoice}
          disabled={invoiceLoading}
          activeOpacity={0.85}
        >
          {invoiceLoading
            ? <ActivityIndicator color="#1056E0" />
            : <Text style={styles.invoiceBtnText}>📄 Télécharger la facture</Text>}
        </TouchableOpacity>

        {/* Note notification */}
        <View style={styles.notifNote}>
          <Text style={styles.notifIcon}>📩</Text>
          <Text style={styles.notifText}>Une notification et un email de confirmation vous ont été envoyés.</Text>
        </View>

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        {/* CTAs */}
        <View style={styles.ctas}>
          <TouchableOpacity
            style={styles.primaryCTA}
            onPress={() => navigation.navigate('BookingDetail', { bookingId })}
          >
            <Text style={styles.primaryCTAText}>Voir ma réservation</Text>
          </TouchableOpacity>
          {/* Accès rapide à la discussion ouverte automatiquement */}
          <TouchableOpacity
            style={styles.chatCTA}
            onPress={() => navigation.navigate('Chat', {
              bookingId,
              recipientName: booking.property.title ?? booking.property.name ?? 'Le responsable',
            })}
          >
            <Text style={styles.chatCTAText}>💬 Ouvrir la messagerie</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryCTA}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
          >
            <Text style={styles.secondaryCTAText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  errorIcon: { fontSize: 48 },
  errorText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },

  // Vérification / en attente
  checkingTitle: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center', marginTop: 8 },
  checkingBody: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 12 },
  pendingIcon: { fontSize: 52 },

  // Échec
  failCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  failMark: { fontSize: 40, color: '#fff', fontWeight: '700' },
  failTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  failBody: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 12 },

  // Coche succès
  checkWrap: { alignItems: 'center', paddingTop: 40, paddingBottom: 24, paddingHorizontal: 16 },
  checkCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#1056E0',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1056E0', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    marginBottom: 16,
  },
  checkMark: { fontSize: 40, color: '#fff', fontWeight: '700' },
  confirmedTitle: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center' },
  refText: { fontSize: 14, color: '#6B7280', marginTop: 6, fontFamily: 'monospace' },

  // Carte propriété
  propertyCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  propertyImage: { width: 80, height: 90 },
  imageFallback: { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  imageFallbackText: { fontSize: 28 },
  propertyInfo: { flex: 1, padding: 12, gap: 3 },
  propertyName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  propertyCity: { fontSize: 12, color: '#6B7280' },
  bookingDates: { fontSize: 12, color: '#374151', marginTop: 4 },
  bookingDetails: { fontSize: 12, color: '#6B7280' },

  // Récapitulatif paiement
  paymentBox: {
    marginHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 12,
  },
  paymentTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentLabel: { fontSize: 13, color: '#4B5563', flex: 1 },
  paymentTotal: { fontSize: 15, fontWeight: '800', color: '#111827' },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paidAmount: { fontSize: 14, fontWeight: '700', color: '#1056E0' },
  paidBadge: { backgroundColor: '#BBF7D0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  paidBadgeText: { fontSize: 10, fontWeight: '700', color: '#166534' },
  cashAmount: { fontSize: 14, fontWeight: '700', color: '#D97706' },

  // Encart restaurant gratuit
  freeBox: {
    marginHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  freeBoxText: { fontSize: 13, color: '#166534', lineHeight: 19 },

  // Avertissement
  warningBox: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningIcon: { fontSize: 18, marginTop: 1 },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },

  // Facture
  invoiceBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#1056E0',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  invoiceBtnText: { color: '#1056E0', fontSize: 14, fontWeight: '700' },

  // Note notification
  notifNote: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  notifIcon: { fontSize: 16, marginTop: 1 },
  notifText: { flex: 1, fontSize: 13, color: '#6B7280', lineHeight: 19 },
  inlineError: { fontSize: 13, color: '#DC2626', textAlign: 'center', marginHorizontal: 16, marginBottom: 12 },

  // CTAs
  ctas: { paddingHorizontal: 16, gap: 10 },
  primaryCTA: {
    backgroundColor: '#1056E0', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', width: '100%',
  },
  primaryCTAText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  chatCTA: {
    backgroundColor: '#F0F4FF', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', width: '100%',
  },
  chatCTAText: { color: '#1056E0', fontSize: 15, fontWeight: '700' },
  secondaryCTA: {
    borderWidth: 1.5, borderColor: '#1056E0',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%',
  },
  secondaryCTAText: { color: '#1056E0', fontSize: 15, fontWeight: '700' },
});
