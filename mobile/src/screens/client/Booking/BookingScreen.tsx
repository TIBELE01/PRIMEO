// BookingScreen — tunnel de réservation adapté au secteur
// • mode « stay »  : hébergements / hôtels — séjour par nuits + paiement
// • mode « table » : restaurants — date + heure + couverts, gratuit (sans paiement)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../../navigation/types';
import type { RouteProp } from '@react-navigation/native';
import { bookingsApi } from '../../../services/api/endpoints/bookings';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { usersApi } from '../../../services/api/endpoints/users';
import { PaymentOptionsSelector } from './PaymentOptionsSelector';
import { useCurrency } from '../../../hooks/useCurrency';
import { generateUUID } from '../../../utils/uuid';

type Props = {
  navigation: NativeStackNavigationProp<ClientStackParamList, 'Booking'>;
  route: RouteProp<ClientStackParamList, 'Booking'>;
};

const STAY_STEPS = [
  { id: 1, label: 'Séjour' },
  { id: 2, label: 'Coordonnées' },
  { id: 3, label: 'Prix' },
  { id: 4, label: 'Paiement' },
  { id: 5, label: 'Confirmation' },
];

const TABLE_STEPS = [
  { id: 1, label: 'Table' },
  { id: 2, label: 'Coordonnées' },
  { id: 3, label: 'Confirmation' },
];

const INTEREST_STEPS = [
  { id: 1, label: 'Intérêt' },
  { id: 2, label: 'Coordonnées' },
  { id: 3, label: 'Envoi' },
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  // Numéro ivoirien / international — au moins 8 chiffres
  return phone.replace(/[^0-9]/g, '').length >= 8;
}

function formatDate(dateStr: string): string {
  // Garde anti "NaN undefined" : new Date('') / new Date(undefined) → Invalid Date
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
  return `${d.getDate()} ${monthNames[d.getMonth()]}`;
}

function countNights(checkIn: string, checkOut: string): number {
  const diff = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
  );
  // NaN (date invalide) ou plage inversée → 1 nuit par défaut (jamais NaN dans l'UI)
  return Number.isFinite(diff) && diff > 0 ? diff : 1;
}

export function BookingScreen({ navigation, route }: Props) {
  const { formatPrice, isIndicative, selectedCurrency, rateDate } = useCurrency();
  // route.params peut être absent (deep link, restauration d'état) :
  // ne jamais déstructurer sans repli sous peine de crash immédiat.
  const {
    propertyId,
    checkIn,
    checkOut,
    guests: initialGuests,
    propertyName,
    pricePerNight: paramPricePerNight,
    mode = 'stay',
    reservationTime,
  } = route.params ?? ({} as Partial<ClientStackParamList['Booking']>);

  const isTable = mode === 'table';
  const isInterest = mode === 'interest';
  const STEPS = useMemo(() => {
    if (isInterest) return INTEREST_STEPS;
    if (isTable) return TABLE_STEPS;
    return STAY_STEPS;
  }, [isTable, isInterest]);
  const LAST_STEP = STEPS.length;

  // Données chargées
  const [pricePerNight, setPricePerNight] = useState<number | null>(paramPricePerNight ?? null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [maxGuests, setMaxGuests] = useState<number>(10);
  const [resolvedPropertyName, setResolvedPropertyName] = useState<string>(propertyName ?? '');

  // Saisies utilisateur
  const [guests, setGuests] = useState<number>(initialGuests ?? 1);
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoApplied, setPromoApplied] = useState<boolean>(false);
  const [paymentOption, setPaymentOption] = useState<'full_online' | 'ten_percent_online' | 'zero_online'>('ten_percent_online');

  // Coordonnées du client (pré-remplies depuis le profil, confirmées avant paiement)
  const [contactFirstName, setContactFirstName] = useState<string>('');
  const [contactLastName, setContactLastName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');

  // Message d'intérêt facultatif (mode immobilier)
  const [interestMessage, setInterestMessage] = useState<string>('');

  // Navigation et état
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // One unique key per screen mount — reused on network retries so the server
  // returns the cached response instead of initiating a second Genius Pay charge.
  const idempotencyKey = useRef<string>(generateUUID());

  const nights = countNights(checkIn, checkOut);
  const basePrice = pricePerNight != null ? pricePerNight * nights : 0;
  const walletDeduction = Math.min(walletBalance, Math.max(0, basePrice));
  const totalAmount = Math.max(0, basePrice - walletDeduction);
  const tenPercent = Math.ceil(totalAmount * 0.1);
  const ninetyPercent = totalAmount - tenPercent;

  const fetchData = useCallback(async () => {
    if (!propertyId) { setIsFetching(false); return; } // params invalides — écran d'erreur affiché
    setIsFetching(true);
    try {
      const [propertyRes, profileRes] = await Promise.allSettled([
        paramPricePerNight == null ? propertiesApi.getById(propertyId) : Promise.resolve(null),
        usersApi.getProfile(),
      ]);

      if (propertyRes.status === 'fulfilled' && propertyRes.value != null) {
        const data = propertyRes.value?.data;
        const prop = data?.property ?? data?.data?.property ?? data;
        if (prop) {
          if (prop.pricePerNight != null) setPricePerNight(prop.pricePerNight);
          if (prop.maxGuests != null) setMaxGuests(prop.maxGuests);
          if (prop.name && !propertyName) setResolvedPropertyName(prop.name);
        }
      }

      if (profileRes.status === 'fulfilled') {
        const res = profileRes.value;
        const userData =
          res?.data?.user ?? res?.data?.data?.user ?? res?.data?.data ?? res?.data;
        const balance = userData?.walletBalance ?? 0;
        setWalletBalance(typeof balance === 'number' ? balance : 0);
        // Pré-remplir les coordonnées avec le profil
        if (userData?.firstName) setContactFirstName(String(userData.firstName));
        if (userData?.lastName) setContactLastName(String(userData.lastName));
        if (userData?.phone) setContactPhone(String(userData.phone));
        if (userData?.email) setContactEmail(String(userData.email));
      }
    } catch {
      // Données non critiques — on continue
    } finally {
      setIsFetching(false);
    }
  }, [propertyId, paramPricePerNight, propertyName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApplyPromo = () => {
    const trimmed = promoCodeInput.trim();
    if (!trimmed) return;
    setPromoCode(trimmed);
    setPromoApplied(true);
  };

  const handleRemovePromo = () => {
    setPromoApplied(false);
    setPromoCode('');
    setPromoCodeInput('');
  };

  const validateContact = (): boolean => {
    if (!contactFirstName.trim() || !contactLastName.trim()) {
      setError('Veuillez renseigner votre nom et prénom.');
      return false;
    }
    if (!isValidPhone(contactPhone)) {
      setError('Veuillez renseigner un numéro de téléphone valide (min. 8 chiffres).');
      return false;
    }
    if (!isValidEmail(contactEmail)) {
      setError('Veuillez renseigner une adresse e-mail valide.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError(null);
    // Étape 2 = Coordonnées : valider avant d'avancer
    if (step === 2 && !validateContact()) return;
    setStep(s => Math.min(s + 1, LAST_STEP));
  };

  const handleBack = () => {
    setError(null);
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(s => Math.max(s - 1, 1));
    }
  };

  const handleConfirm = async () => {
    // Garde-fou : plage de dates cohérente (un séjour exige départ > arrivée).
    // Une plage inversée peut provenir d'un état amont incohérent — on bloque
    // ici plutôt que d'envoyer une requête vouée à l'échec.
    if (!isTable && !isInterest && (!checkIn || !checkOut || checkOut <= checkIn)) {
      setError('Dates de séjour invalides. Retournez en arrière et sélectionnez vos dates.');
      return;
    }
    // Garde-fou : coordonnées valides avant toute création
    if (!validateContact()) {
      setStep(2);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingsApi.create({
        propertyId,
        startDate: checkIn,
        endDate: checkOut,
        guests,
        paymentOption: (isTable || isInterest) ? 'zero_online' : paymentOption,
        contactFirstName: contactFirstName.trim(),
        contactLastName: contactLastName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        ...(isTable && reservationTime ? { reservationTime } : {}),
        ...(isInterest && interestMessage.trim() ? { interestMessage: interestMessage.trim() } : {}),
        ...(!isTable && !isInterest && promoCode ? { promoCode } : {}),
      }, idempotencyKey.current);

      const responseData = res?.data;
      const booking = responseData?.booking ?? responseData?.data?.booking;
      const pricing = responseData?.pricing ?? responseData?.data?.pricing;
      const payment = responseData?.payment ?? responseData?.data?.payment;

      if (!booking || !pricing) throw new Error('Réponse invalide du serveur.');

      if (payment?.checkoutUrl) {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') {
            window.open(payment.checkoutUrl, '_blank', 'noopener,noreferrer');
          }
          navigation.navigate('BookingConfirmation', { bookingId: booking.id });
        } else {
          navigation.navigate('GeniusPayWebView', {
            checkoutUrl: payment.checkoutUrl,
            bookingId: booking.id,
            amountOnline: pricing.onlinePaidAmount,
            paymentOption: paymentOption as 'full_online' | 'ten_percent_online',
          });
        }
      } else if (isInterest) {
        // Intérêt immobilier : ouvrir directement la discussion avec le professionnel
        navigation.replace('Chat', {
          bookingId: booking.id,
          recipientName: resolvedPropertyName || 'Le responsable',
        });
      } else {
        // Confirmation immédiate : ouvrir directement la discussion avec le professionnel
        navigation.navigate('Chat', {
          bookingId: booking.id,
          recipientName: resolvedPropertyName || 'Le responsable',
        });
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) {
        setError('Ces dates ne sont plus disponibles. Retournez en arrière et choisissez d\'autres dates.');
      } else if (status === 502) {
        // Afficher le message réel de Genius Pay pour faciliter le diagnostic
        const detail =
          e?.response?.data?.message ??
          e?.response?.data?.error ??
          'Le service de paiement est temporairement indisponible. Veuillez réessayer.';
        setError(detail);
      } else {
        const msg =
          e?.response?.data?.message ??
          e?.response?.data?.error ??
          e?.message ??
          'Une erreur est survenue. Veuillez réessayer.';
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Paramètres essentiels absents (deep link incomplet, restauration d'état…) :
  // afficher un écran d'erreur récupérable plutôt que de crasher plus loin.
  if (!propertyId || !checkIn) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={styles.loadingText}>
            Informations de réservation manquantes.{'\n'}Veuillez relancer la réservation depuis la fiche du bien.
          </Text>
          <TouchableOpacity
            style={[styles.nextBtn, { paddingHorizontal: 24, marginTop: 12 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.nextBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isFetching) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1056E0" />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isInterest ? 'Exprimer mon intérêt' : isTable ? 'Réserver une table' : 'Réserver'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Indicateur de progression */}
      <View style={styles.progressContainer}>
        {STEPS.map((s, idx) => (
          <React.Fragment key={s.id}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, step >= s.id && styles.stepDotActive, step === s.id && styles.stepDotCurrent]}>
                {step > s.id ? (
                  <Text style={styles.stepCheck}>✓</Text>
                ) : (
                  <Text style={[styles.stepNum, step >= s.id && styles.stepNumActive]}>{s.id}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, step >= s.id && styles.stepLabelActive]}>{s.label}</Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View style={[styles.stepLine, step > s.id && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bannière d'erreur */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerIcon}>⚠️</Text>
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.errorBannerClose}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Étape 1 (immobilier) : Votre intérêt ── */}
        {isInterest && step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Votre intérêt</Text>

            <View style={styles.card}>
              <Text style={styles.propertyName} numberOfLines={2}>
                {resolvedPropertyName || 'Bien immobilier'}
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🏠</Text>
                <Text style={styles.infoText}>Demande d'intérêt — sans paiement</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>💬</Text>
                <Text style={styles.infoText}>Une discussion s'ouvrira avec le responsable</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Message au responsable (facultatif)</Text>
              <TextInput
                style={[styles.fieldInput, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Ex : Je suis intéressé(e) par ce bien. Pouvez-vous me contacter ?"
                placeholderTextColor="#9CA3AF"
                value={interestMessage}
                onChangeText={setInterestMessage}
                multiline
                maxLength={500}
              />
              <Text style={[styles.fieldHint, { textAlign: 'right' }]}>{interestMessage.length}/500</Text>
            </View>

            <View style={styles.freeBox}>
              <Text style={styles.freeBoxText}>
                ✅ Aucun paiement requis. Le responsable vous contactera directement via la messagerie.
              </Text>
            </View>
          </View>
        )}

        {/* ── Étape 1 (restaurant) : Votre table ── */}
        {isTable && step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Votre table</Text>

            <View style={styles.card}>
              <Text style={styles.propertyName} numberOfLines={2}>
                {resolvedPropertyName || 'Restaurant'}
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📅</Text>
                <Text style={styles.infoText}>{formatDate(checkIn)}</Text>
              </View>
              {reservationTime && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>🕐</Text>
                  <Text style={styles.infoText}>{reservationTime}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🍽️</Text>
                <Text style={styles.infoText}>{guests} couvert{guests > 1 ? 's' : ''}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nombre de couverts</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={[styles.counterBtn, guests <= 1 && styles.counterBtnDisabled]}
                  onPress={() => setGuests(g => Math.max(1, g - 1))}
                  disabled={guests <= 1}
                >
                  <Text style={[styles.counterBtnText, guests <= 1 && styles.counterBtnTextDisabled]}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{guests}</Text>
                <TouchableOpacity
                  style={[styles.counterBtn, guests >= maxGuests && styles.counterBtnDisabled]}
                  onPress={() => setGuests(g => Math.min(maxGuests, g + 1))}
                  disabled={guests >= maxGuests}
                >
                  <Text style={[styles.counterBtnText, guests >= maxGuests && styles.counterBtnTextDisabled]}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.maxNote}>Jusqu'à {maxGuests} couverts</Text>
            </View>

            <View style={styles.freeBox}>
              <Text style={styles.freeBoxText}>
                ✅ La réservation de table est gratuite et sans prépaiement.
              </Text>
            </View>
          </View>
        )}

        {/* ── Étape 1 (séjour) : Votre séjour ── */}
        {!isTable && !isInterest && step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Votre séjour</Text>

            <View style={styles.card}>
              <Text style={styles.propertyName} numberOfLines={2}>
                {resolvedPropertyName || 'Propriété'}
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📅</Text>
                <Text style={styles.infoText}>
                  {formatDate(checkIn)} → {formatDate(checkOut)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🌙</Text>
                <Text style={styles.infoText}>
                  {nights} nuit{nights > 1 ? 's' : ''}
                </Text>
              </View>
              {pricePerNight != null && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>💰</Text>
                  <Text style={styles.infoText}>
                    {formatPrice(pricePerNight)} / nuit
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nombre de voyageurs</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={[styles.counterBtn, guests <= 1 && styles.counterBtnDisabled]}
                  onPress={() => setGuests(g => Math.max(1, g - 1))}
                  disabled={guests <= 1}
                >
                  <Text style={[styles.counterBtnText, guests <= 1 && styles.counterBtnTextDisabled]}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{guests}</Text>
                <TouchableOpacity
                  style={[styles.counterBtn, guests >= maxGuests && styles.counterBtnDisabled]}
                  onPress={() => setGuests(g => Math.min(maxGuests, g + 1))}
                  disabled={guests >= maxGuests}
                >
                  <Text style={[styles.counterBtnText, guests >= maxGuests && styles.counterBtnTextDisabled]}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.maxNote}>Maximum {maxGuests} voyageurs</Text>
            </View>
          </View>
        )}

        {/* ── Étape 2 : Coordonnées ── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Vos coordonnées</Text>
            <Text style={styles.stepSubtitle}>
              {isInterest
                ? 'Le responsable utilisera ces informations pour vous recontacter.'
                : 'Ces informations servent à confirmer votre réservation et à traiter le paiement.'}
            </Text>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Prénom *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Votre prénom"
                placeholderTextColor="#9CA3AF"
                value={contactFirstName}
                onChangeText={setContactFirstName}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Nom *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Votre nom"
                placeholderTextColor="#9CA3AF"
                value={contactLastName}
                onChangeText={setContactLastName}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Téléphone *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Ex : 0700000000"
                placeholderTextColor="#9CA3AF"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.fieldHint}>
                {isTable
                  ? 'Nous vous contacterons pour confirmer votre réservation.'
                  : isInterest
                  ? 'Le responsable pourra vous contacter directement à ce numéro.'
                  : 'Requis pour le paiement mobile (Wave, Orange Money…).'}
              </Text>

              <Text style={styles.fieldLabel}>E-mail *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="vous@exemple.com"
                placeholderTextColor="#9CA3AF"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.fieldHint}>Votre confirmation et votre facture y seront envoyées.</Text>
            </View>
          </View>
        )}

        {/* ── Étape 3 (restaurant) : Confirmation gratuite ── */}
        {isTable && step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Confirmer votre table</Text>

            <View style={styles.summaryBlock}>
              <Text style={styles.summaryBlockTitle}>Votre réservation</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Restaurant</Text>
                <Text style={styles.summaryVal} numberOfLines={1}>{resolvedPropertyName || 'Restaurant'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Date</Text>
                <Text style={styles.summaryVal}>{formatDate(checkIn)}</Text>
              </View>
              {reservationTime && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Heure</Text>
                  <Text style={styles.summaryVal}>{reservationTime}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Couverts</Text>
                <Text style={styles.summaryVal}>{guests} couvert{guests > 1 ? 's' : ''}</Text>
              </View>
            </View>

            <View style={styles.summaryBlock}>
              <Text style={styles.summaryBlockTitle}>Vos coordonnées</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Nom</Text>
                <Text style={styles.summaryVal} numberOfLines={1}>{contactFirstName} {contactLastName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Téléphone</Text>
                <Text style={styles.summaryVal}>{contactPhone}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>E-mail</Text>
                <Text style={styles.summaryVal} numberOfLines={1}>{contactEmail}</Text>
              </View>
            </View>

            <View style={styles.freeBox}>
              <Text style={styles.freeBoxText}>
                ✅ Réservation gratuite, sans prépaiement. Confirmation immédiate.
              </Text>
            </View>

            <Text style={styles.confirmNote}>
              En confirmant, vous acceptez les conditions générales de vente de Primeo.
            </Text>
          </View>
        )}

        {/* ── Étape 3 (immobilier) : Récapitulatif et envoi ── */}
        {isInterest && step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Envoyer ma demande</Text>

            <View style={styles.summaryBlock}>
              <Text style={styles.summaryBlockTitle}>Votre intérêt</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Bien</Text>
                <Text style={styles.summaryVal} numberOfLines={2}>{resolvedPropertyName || 'Bien immobilier'}</Text>
              </View>
              {interestMessage.trim() ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Message</Text>
                  <Text style={styles.summaryVal} numberOfLines={3}>{interestMessage.trim()}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.summaryBlock}>
              <Text style={styles.summaryBlockTitle}>Vos coordonnées</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Nom</Text>
                <Text style={styles.summaryVal} numberOfLines={1}>{contactFirstName} {contactLastName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Téléphone</Text>
                <Text style={styles.summaryVal}>{contactPhone}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>E-mail</Text>
                <Text style={styles.summaryVal} numberOfLines={1}>{contactEmail}</Text>
              </View>
            </View>

            <View style={styles.freeBox}>
              <Text style={styles.freeBoxText}>
                ✅ Aucun paiement. Une discussion s'ouvrira immédiatement avec le responsable.
              </Text>
            </View>

            <Text style={styles.confirmNote}>
              En confirmant, vous acceptez les conditions générales de Primeo.
            </Text>
          </View>
        )}

        {/* ── Étape 3 (séjour) : Prix & Réductions ── */}
        {!isTable && !isInterest && step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Prix & Réductions</Text>

            {pricePerNight != null ? (
              <View style={styles.priceCard}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    {formatPrice(pricePerNight)} × {nights} nuit{nights > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.priceValue}>{formatPrice(basePrice)}</Text>
                </View>

                {walletBalance > 0 && (
                  <View style={styles.priceRow}>
                    <Text style={styles.walletLabel}>Crédits parrainage</Text>
                    <Text style={styles.walletValue}>−{formatPrice(walletDeduction)}</Text>
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.priceRow}>
                  <Text style={styles.totalLabel}>Total estimé</Text>
                  <Text style={styles.totalValue}>{formatPrice(totalAmount)}</Text>
                </View>

                {isIndicative && (
                  <Text style={styles.indicativeNote}>
                    ℹ️ Montants en {selectedCurrency} à titre indicatif. Paiement en FCFA.
                    {rateDate ? ` Taux du ${rateDate}.` : ''}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.priceCard}>
                <Text style={styles.priceUndefined}>Prix à confirmer par le propriétaire</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Code promo (optionnel)</Text>
              <View style={styles.promoRow}>
                <TextInput
                  style={[styles.promoInput, promoApplied && styles.promoInputApplied]}
                  placeholder="Entrez votre code"
                  placeholderTextColor="#9CA3AF"
                  value={promoCodeInput}
                  onChangeText={setPromoCodeInput}
                  autoCapitalize="characters"
                  editable={!promoApplied}
                />
                <TouchableOpacity
                  style={[styles.promoBtn, promoApplied && styles.promoBtnApplied]}
                  onPress={promoApplied ? handleRemovePromo : handleApplyPromo}
                >
                  <Text style={[styles.promoBtnText, promoApplied && styles.promoBtnTextApplied]}>
                    {promoApplied ? 'Retirer' : 'Appliquer'}
                  </Text>
                </TouchableOpacity>
              </View>
              {promoApplied ? (
                <Text style={styles.promoNoteSuccess}>✓ Code "{promoCode}" sera validé à la confirmation</Text>
              ) : (
                <Text style={styles.promoNote}>Le code sera validé à la confirmation de la réservation</Text>
              )}
            </View>
          </View>
        )}

        {/* ── Étape 4 : Mode de paiement (séjour uniquement) ── */}
        {!isTable && !isInterest && step === 4 && (
          <View>
            <Text style={styles.stepTitle}>Mode de paiement</Text>
            <PaymentOptionsSelector
              totalAmount={totalAmount}
              selected={paymentOption}
              onSelect={setPaymentOption}
            />
          </View>
        )}

        {/* ── Étape 5 : Récapitulatif (séjour uniquement) ── */}
        {!isTable && !isInterest && step === 5 && (
          <View>
            <Text style={styles.stepTitle}>Récapitulatif</Text>

            {/* Propriété */}
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryBlockTitle}>Séjour</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Propriété</Text>
                <Text style={styles.summaryVal} numberOfLines={1}>
                  {resolvedPropertyName || 'Propriété'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Dates</Text>
                <Text style={styles.summaryVal}>
                  {formatDate(checkIn)} → {formatDate(checkOut)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Durée</Text>
                <Text style={styles.summaryVal}>{nights} nuit{nights > 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Voyageurs</Text>
                <Text style={styles.summaryVal}>{guests} personne{guests > 1 ? 's' : ''}</Text>
              </View>
            </View>

            {/* Coordonnées */}
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryBlockTitle}>Coordonnées</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Nom</Text>
                <Text style={styles.summaryVal} numberOfLines={1}>
                  {contactFirstName} {contactLastName}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Téléphone</Text>
                <Text style={styles.summaryVal}>{contactPhone}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>E-mail</Text>
                <Text style={styles.summaryVal} numberOfLines={1}>{contactEmail}</Text>
              </View>
            </View>

            {/* Prix */}
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryBlockTitle}>Prix</Text>
              {pricePerNight != null && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>
                    {formatPrice(pricePerNight)} × {nights} nuit{nights > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.summaryVal}>{formatPrice(basePrice)}</Text>
                </View>
              )}
              {walletDeduction > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Crédits parrainage</Text>
                  <Text style={[styles.summaryVal, { color: '#7C3AED' }]}>−{formatPrice(walletDeduction)}</Text>
                </View>
              )}
              {promoApplied && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Code "{promoCode}"</Text>
                  <Text style={[styles.summaryVal, { color: '#059669' }]}>sera appliqué</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                <Text style={styles.summaryTotalKey}>Total</Text>
                <Text style={styles.summaryTotalVal}>{formatPrice(totalAmount)}</Text>
              </View>
            </View>

            {/* Paiement */}
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryBlockTitle}>Paiement</Text>
              {paymentOption === 'full_online' && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>💳 En ligne maintenant</Text>
                    <Text style={styles.summaryVal}>{formatPrice(totalAmount)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>🏠 Sur place</Text>
                    <Text style={styles.summaryVal}>{formatPrice(0)}</Text>
                  </View>
                </>
              )}
              {paymentOption === 'ten_percent_online' && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>💳 En ligne maintenant (10%)</Text>
                    <Text style={styles.summaryVal}>{formatPrice(tenPercent)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>🏠 Sur place (90%)</Text>
                    <Text style={styles.summaryVal}>{formatPrice(ninetyPercent)}</Text>
                  </View>
                </>
              )}
              {paymentOption === 'zero_online' && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>💵 Intégralement sur place</Text>
                  <Text style={styles.summaryVal}>{formatPrice(totalAmount)}</Text>
                </View>
              )}
            </View>

            <Text style={styles.confirmNote}>
              En confirmant, vous acceptez les conditions générales de vente de Primeo.
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Boutons de navigation */}
      <View style={styles.footer}>
        {step < LAST_STEP ? (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>Suivant →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.confirmBtn, isLoading && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmBtnText}>
              {isInterest ? 'Envoyer ma demande' : 'Confirmer la réservation'}
            </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#6B7280', marginTop: 8 },

  // En-tête
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 28, color: '#1056E0', lineHeight: 32 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

  // Progression
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepItem: { alignItems: 'center', flex: 0 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepDotActive: { borderColor: '#1056E0', backgroundColor: '#1056E0' },
  stepDotCurrent: { borderColor: '#1056E0', backgroundColor: '#FFFFFF' },
  stepCheck: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },
  stepNum: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  stepNumActive: { color: '#1056E0' },
  stepLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 3, fontWeight: '500' },
  stepLabelActive: { color: '#1056E0' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 14, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#1056E0' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  // Titre d'étape
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 20 },
  stepSubtitle: { fontSize: 14, color: '#6B7280', marginTop: -12, marginBottom: 20, lineHeight: 20 },

  // Champs de formulaire (coordonnées)
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  fieldInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  fieldHint: { fontSize: 12, color: '#9CA3AF', marginTop: 5 },

  // Bannière d'erreur
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerIcon: { fontSize: 16, marginTop: 1 },
  errorBannerText: { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 19 },
  errorBannerClose: { fontSize: 14, color: '#DC2626', fontWeight: '700', padding: 2 },

  // Carte propriété (étape 1)
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  propertyName: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoIcon: { fontSize: 15 },
  infoText: { fontSize: 14, color: '#4B5563' },

  // Section
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },

  // Counter
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1056E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnDisabled: { borderColor: '#D1D5DB' },
  counterBtnText: { fontSize: 22, color: '#1056E0', lineHeight: 26 },
  counterBtnTextDisabled: { color: '#D1D5DB' },
  counterValue: { fontSize: 22, fontWeight: '700', color: '#111827', minWidth: 32, textAlign: 'center' },
  maxNote: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },

  // Prix (étape 2)
  priceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceLabel: { fontSize: 14, color: '#374151' },
  priceValue: { fontSize: 14, color: '#374151', fontWeight: '500' },
  walletLabel: { fontSize: 14, color: '#7C3AED' },
  walletValue: { fontSize: 14, color: '#7C3AED', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#1056E0' },
  priceUndefined: { fontSize: 14, color: '#6B7280', textAlign: 'center', padding: 8 },
  indicativeNote: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  // Promo
  promoRow: { flexDirection: 'row', gap: 10 },
  promoInput: {
    flex: 1,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  promoInputApplied: { borderColor: '#1056E0', backgroundColor: '#F0FDF4' },
  promoBtn: {
    height: 46,
    paddingHorizontal: 16,
    backgroundColor: '#1056E0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBtnApplied: { backgroundColor: '#FEF9C3', borderWidth: 1.5, borderColor: '#CA8A04' },
  promoBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  promoBtnTextApplied: { color: '#92400E' },
  promoNote: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  promoNoteSuccess: { fontSize: 12, color: '#059669', marginTop: 6 },

  // Récapitulatif (étape 4)
  summaryBlock: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryBlockTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryRowTotal: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB', marginBottom: 0 },
  summaryKey: { fontSize: 14, color: '#374151', flex: 1 },
  summaryVal: { fontSize: 14, color: '#111827', fontWeight: '500', textAlign: 'right', maxWidth: '50%' },
  summaryTotalKey: { fontSize: 16, fontWeight: '700', color: '#111827' },
  summaryTotalVal: { fontSize: 18, fontWeight: '800', color: '#1056E0' },
  confirmNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 8, lineHeight: 18 },

  // Encart gratuit restaurant
  freeBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    marginBottom: 20,
  },
  freeBoxText: { fontSize: 14, color: '#166534', lineHeight: 20 },

  // Footer boutons
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  nextBtn: {
    backgroundColor: '#1056E0',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  confirmBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
