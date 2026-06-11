// Fiche détail propriété — moteur partagé hébergements, hôtels, restaurants
// et immobilier. Carousel + en-tête thématique (prix gauche / action droite) +
// sections accordéon adaptées au type (seule "Caractéristiques" ouverte par défaut).
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, Share, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '@navigation/types';
import { useCurrency } from '../../../hooks/useCurrency';
import { useAuthStore } from '../../../store/authStore';
import { usePropertyDetail } from './hooks/usePropertyDetail';
import { ImageGallery } from './components/ImageGallery';
import { VirtualTourButton } from './components/VirtualTourButton';
import { Accordion } from './components/Accordion';
import { BookingModal } from './components/BookingModal';
import { RestaurantReservationModal } from './components/RestaurantReservationModal';
import { PresentationSection } from './sections/PresentationSection';
import { AmenitiesSection } from './sections/AmenitiesSection';
import { CalendarSection } from './sections/CalendarSection';
import { HostSection } from './sections/HostSection';
import { LocationSection } from './sections/LocationSection';
import { CharacteristicsSection } from './sections/CharacteristicsSection';
import { RulesSection } from './sections/RulesSection';
import { ContactHostSection } from './sections/ContactHostSection';
import { NearbySection } from './sections/NearbySection';
import { FAQSection } from './sections/FAQSection';
import { TestimonialsCarousel } from './sections/TestimonialsCarousel';
import { MenuSection } from './sections/MenuSection';
import { RealEstateDocsSection } from './sections/RealEstateDocsSection';
import { CancellationPolicySection } from './sections/CancellationPolicySection';
import { NetworkStatus } from '../../../components/common/NetworkStatus';
import { favoritesApi } from '../../../services/api/endpoints/favorites';
import { kindOf, themeColor, actionLabel, priceDisplay, defaultAmenitiesFor } from './detailContent';
import { addDaysStr, todayStr } from '../../../utils/dates';
import { View as RNView, Text as RNText, StyleSheet as RNStyleSheet } from 'react-native';
import { trackEvent } from '../../../services/analytics';
import { VideoView, useVideoPlayer } from 'expo-video';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

// Bloc interne — types de chambres hôtel (affiché seulement si roomTypes présent)
function HotelRoomTypesBlock({
  roomTypes, color, formatPrice,
}: {
  roomTypes: NonNullable<import('@/types/property').Property['roomTypes']>;
  color: string;
  formatPrice: (n: number) => string;
}) {
  return (
    <RNView style={rtStyles.wrap}>
      {roomTypes.map((rt, i) => (
        <RNView key={rt.id ?? i} style={rtStyles.row}>
          <RNView style={rtStyles.info}>
            <RNText style={rtStyles.label}>{rt.label}</RNText>
            <RNText style={rtStyles.detail}>
              {rt.capacity} pers.{rt.beds ? ` · ${rt.beds} lit(s)` : ''}
            </RNText>
          </RNView>
          <RNText style={[rtStyles.price, { color }]}>
            {formatPrice(rt.pricePerNight)}<RNText style={rtStyles.unit}> /nuit</RNText>
          </RNText>
        </RNView>
      ))}
    </RNView>
  );
}

const rtStyles = RNStyleSheet.create({
  wrap:   { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  row:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  info:   { flex: 1 },
  label:  { fontSize: 14, fontWeight: '700', color: '#111827' },
  detail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  price:  { fontSize: 15, fontWeight: '800' },
  unit:   { fontSize: 11, fontWeight: '400', color: '#6B7280' },
});

const DAYS_NEW = 30;
const isNew = (d: string) => (Date.now() - new Date(d).getTime()) / 86_400_000 < DAYS_NEW;

function VideoPlayerCard({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => { p.loop = false; });
  return (
    <View style={styles.videoCard}>
      <VideoView player={player} style={styles.videoView} allowsFullscreen nativeControls contentFit="contain" />
    </View>
  );
}

export function PropertyDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  // route.params peut être absent (deep link, notification, restauration d'état) :
  // ne jamais déstructurer sans repli sous peine de crash immédiat.
  const { propertyId } = (route.params ?? {}) as { propertyId?: string };
  const { formatPrice } = useCurrency();

  const { property, isLoading, error, isFromCache } = usePropertyDetail(propertyId ?? '');
  const [showBooking, setShowBooking] = useState(false);
  const [showRestaurant, setShowRestaurant] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{ checkIn: string; checkOut: string } | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const isAuthenticated = !!useAuthStore(s => s.accessToken);
  const kind = property ? kindOf(property.type) : 'hebergement';
  const theme = useMemo(() => themeColor(property?.type ?? 'apartment'), [property?.type]);

  // Charge le statut favori au montage si l'utilisateur est connecté
  // Statistique anonyme de consultation de fiche (soumise au consentement)
  React.useEffect(() => {
    if (propertyId) trackEvent('property_view', { propertyId });
  }, [propertyId]);

  React.useEffect(() => {
    if (!isAuthenticated || !propertyId) return;
    favoritesApi.list()
      .then(res => {
        const favs: any[] = res?.data?.data ?? res?.data ?? [];
        setIsFav(favs.some(f => f.propertyId === propertyId || f.property?.id === propertyId));
      })
      .catch(() => { /* ignore */ });
  }, [propertyId, isAuthenticated]);

  const handleShare = useCallback(async () => {
    if (!property) return;
    await Share.share({ message: `${property.name} — ${property.city} sur PRIMEO`, title: property.name });
  }, [property]);

  // Redirige vers la connexion. « Connexion » est l'onglet d'auth de PublicTabs ;
  // depuis la pile Recherche, navigate() remonte automatiquement au parent qui
  // l'expose. On remonte explicitement via getParent() pour rester robuste même
  // si l'écran est imbriqué plus profondément. Hors PublicTabs (cas authentifié),
  // ce chemin n'est jamais atteint car gardé par isAuthenticated.
  const goToLogin = useCallback(() => {
    const target = navigation.getParent() ?? navigation;
    (target as any).navigate('Connexion');
  }, [navigation]);

  // Garde d'authentification commune : affiche l'invite de connexion et renvoie
  // false si l'utilisateur n'est pas connecté. Centralisée pour que TOUS les
  // points d'entrée (action principale ET bouton « Réessayer ») soient protégés.
  const requireAuth = useCallback(() => {
    if (isAuthenticated) return true;
    Alert.alert(
      'Connexion requise',
      'Connectez-vous pour réserver ou exprimer votre intérêt.',
      [{ text: 'Se connecter', onPress: goToLogin }, { text: 'Plus tard', style: 'cancel' }],
    );
    return false;
  }, [isAuthenticated, goToLogin]);

  const handleToggleFavorite = useCallback(async () => {
    if (!isAuthenticated) { requireAuth(); return; }
    if (favLoading || !propertyId) return;
    setFavLoading(true);
    const wasF = isFav;
    setIsFav(!wasF);
    try {
      if (wasF) await favoritesApi.remove(propertyId);
      else await favoritesApi.add(propertyId);
    } catch {
      setIsFav(wasF); // rollback
    } finally {
      setFavLoading(false);
    }
  }, [isAuthenticated, favLoading, isFav, propertyId, requireAuth]);

  const handleAction = useCallback(() => {
    if (!property) return;
    // Visiteur non connecté — rediriger vers la connexion
    if (!requireAuth()) return;
    if (kind === 'real_estate') {
      // Immobilier : tunnel d'intérêt (sans paiement, crée une réservation + discussion)
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
      navigation.navigate('Booking', {
        propertyId: property.id,
        checkIn: today,
        checkOut: tomorrow,
        guests: 1,
        propertyName: property.name,
        mode: 'interest',
      });
      return;
    }
    if (kind === 'restaurant') {
      // Restaurant : réservation de table (date + heure + couverts), jamais « par nuit »
      setShowRestaurant(true);
      return;
    }
    if (selectedDates) {
      navigation.navigate('Booking', {
        propertyId: property.id,
        checkIn: selectedDates.checkIn,
        checkOut: selectedDates.checkOut,
        guests: 1,
        propertyName: property.name,
        pricePerNight: property.pricePerNight ?? undefined,
        mode: 'stay',
      });
    } else {
      setShowBooking(true);
    }
  }, [property, kind, selectedDates, navigation, requireAuth]);

  const handleOrder = useCallback(() => {
    if (!property) return;
    if (!requireAuth()) return;
    navigation.navigate('RestaurantOrderCart', {
      propertyId: property.id,
      propertyName: property.name,
    });
  }, [property, navigation, requireAuth]);

  const handleAddReview = useCallback(() => {
    Alert.alert(
      'Ajouter un avis',
      kind === 'real_estate'
        ? 'Vous pourrez laisser un avis après une visite du bien.'
        : kind === 'restaurant'
        ? 'Vous pourrez laisser un avis après votre visite au restaurant.'
        : 'Vous pourrez laisser un avis après votre séjour.',
    );
  }, [kind]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1056E0" />
      </SafeAreaView>
    );
  }

  if (error || !property) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error ?? 'Propriété introuvable'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const allMedia = (property.images ?? []) as Array<{ id?: string; url: string; mediaType?: string }>;
  const images = allMedia.filter(i => i.mediaType !== 'video').map(i => i.url);
  const videoMedia = allMedia.filter(i => i.mediaType === 'video');
  const showNew = isNew(property.createdAt);
  const ownerName = `${property.owner?.firstName ?? ''} ${property.owner?.lastName ?? ''}`.trim() || 'Le responsable';

  // ── Prix : logique par type (nuit / mois / vente / plat) ──
  const { price: priceValue, unit, prefix: pricePrefix } = priceDisplay(property);
  const hostTitle = kind === 'restaurant' ? 'Profil du responsable'
    : kind === 'real_estate' ? 'Responsable du bien'
    : 'Profil de l\'hôte';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <NetworkStatus />
      {isFromCache && (
        <View style={styles.cacheNotice}>
          <Text style={styles.cacheNoticeText}>📋 Données en cache — peut ne pas être à jour</Text>
        </View>
      )}

      {/* Floating header */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerBtn} disabled={favLoading}>
            <Text style={[styles.headerBtnText, isFav && { color: '#EF4444' }]}>
              {isFav ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Image carousel */}
        <ImageGallery images={images} />

        {/* Badges */}
        <View style={styles.badges}>
          {property.isBoosted && <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}><Text style={styles.badgeText}>⚡ Boosté</Text></View>}
          {property.virtualTour?.available && <View style={[styles.badge, { backgroundColor: '#6366F1' }]}><Text style={styles.badgeText}>🔭 Visite 3D</Text></View>}
          {(property.isSuperHost || property.owner?.isSuperHost) && <View style={[styles.badge, { backgroundColor: '#D67309' }]}><Text style={styles.badgeText}>⭐ Super Hôte</Text></View>}
          {showNew && <View style={[styles.badge, { backgroundColor: '#16A34A' }]}><Text style={styles.badgeText}>✨ Nouveau</Text></View>}
        </View>

        {/* Title + Location + Rating */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{property.name}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.location}>📍 {property.city}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.star}>★</Text>
              <Text style={styles.rating}>{(Number(property.rating) || 0).toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({property.reviewCount} avis)</Text>
            </View>
          </View>
        </View>

        {/* ── En-tête : prix (gauche) + bouton d'action (droite) ── */}
        <View style={[styles.headerCard, { borderColor: theme.color }]}>
          <View style={styles.priceWrap}>
            {priceValue != null ? (
              <>
                {pricePrefix ? <Text style={styles.pricePrefix}>{pricePrefix}</Text> : null}
                <Text style={[styles.price, { color: theme.color }]}>{formatPrice(priceValue)}</Text>
                {unit ? <Text style={styles.priceUnit}>{unit}</Text> : null}
              </>
            ) : (
              <Text style={styles.priceUnit}>Prix sur demande</Text>
            )}
          </View>
          <View style={kind === 'restaurant' ? styles.restaurantActions : undefined}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.color }]} onPress={handleAction} activeOpacity={0.88}>
              <Text style={styles.actionBtnText}>{actionLabel(property.type)}</Text>
            </TouchableOpacity>
            {kind === 'restaurant' && (
              <TouchableOpacity style={[styles.orderBtn, { borderColor: theme.color }]} onPress={handleOrder} activeOpacity={0.88}>
                <Text style={[styles.orderBtnText, { color: theme.color }]}>🛒 Commander</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Virtual tour (3D) — only when available */}
        {property.virtualTour?.available && (
          <View style={styles.vtWrap}>
            <VirtualTourButton virtualTour={property.virtualTour} propertyName={property.name} />
          </View>
        )}

        {/* ── Vidéos de présentation ── */}
        {videoMedia.length > 0 && (
          <Accordion title="Vidéos" icon="🎬" color={theme.color}>
            <View style={styles.videoSection}>
              {videoMedia.map((v, idx) => (
                <VideoPlayerCard key={v.id ?? String(idx)} uri={v.url} />
              ))}
            </View>
          </Accordion>
        )}

        {/* ── 1. Présentation ── */}
        <Accordion title="Présentation" icon="📝" color={theme.color}>
          <PresentationSection description={property.description || 'Aucune description fournie pour le moment.'} />
        </Accordion>

        {/* ── 2. Caractéristiques principales ── */}
        <Accordion title="Caractéristiques" icon="📋" color={theme.color} defaultOpen>
          <CharacteristicsSection property={property} />
        </Accordion>

        {/* ── 3a. Hôtel : types de chambres et tarifs ── */}
        {kind === 'hotel' && (property.roomTypes?.length ?? 0) > 0 && (
          <Accordion title="Types de chambres" icon="🛎" color={theme.color} subtitle="Tarifs par catégorie">
            <HotelRoomTypesBlock roomTypes={property.roomTypes!} color={theme.color} formatPrice={formatPrice} />
          </Accordion>
        )}

        {/* ── 3b. Équipements & services ── */}
        <Accordion
          title={kind === 'restaurant' ? 'Services proposés' : 'Équipements & services'}
          icon="🛎️"
          color={theme.color}
        >
          <AmenitiesSection amenities={defaultAmenitiesFor(property)} color={theme.color} />
        </Accordion>

        {/* ── 4. Restaurant : Menu ── */}
        {kind === 'restaurant' && (
          <Accordion title="Notre menu" icon="🍽️" color={theme.color} subtitle="Plats & boissons">
            <MenuSection property={property} color={theme.color} />
          </Accordion>
        )}

        {/* ── 5. Immobilier : documents protégés ── */}
        {kind === 'real_estate' && (
          <Accordion title="Documents légaux" icon="📄" color={theme.color} subtitle="Titre foncier, ACD…">
            <RealEstateDocsSection property={property} color={theme.color} />
          </Accordion>
        )}

        {/* ── 6. Disponibilités & calendrier (sauf immobilier) ── */}
        {kind !== 'real_estate' && (
          <Accordion
            title={kind === 'restaurant' ? 'Réserver une table' : 'Disponibilités'}
            icon="📅"
            color={theme.color}
            subtitle={kind === 'restaurant' ? 'Choisissez votre créneau' : 'Sélectionnez vos dates'}
          >
            <CalendarSection
              propertyId={property.id}
              propertyType={property.type}
              onDatesSelected={setSelectedDates}
            />
          </Accordion>
        )}

        {/* ── 7. Avis clients (avant localisation pour la preuve sociale) ── */}
        <Accordion title="Avis clients" icon="⭐" color={theme.color}>
          <TestimonialsCarousel
            reviewsSummary={property.reviewsSummary}
            color={theme.color}
            onAddReview={handleAddReview}
          />
        </Accordion>

        {/* ── 8. Localisation & carte ── */}
        <Accordion title="Localisation" icon="📍" color={theme.color}>
          <LocationSection
            latitude={property.latitude}
            longitude={property.longitude}
            city={property.city}
            isBooked={false}
            color={theme.color}
          />
        </Accordion>

        {/* ── 9. À proximité ── */}
        <Accordion title="À proximité" icon="🧭" color={theme.color} subtitle="Commerces, transports, attractions">
          <NearbySection property={property} color={theme.color} />
        </Accordion>

        {/* ── 10. Profil de l'hôte / responsable ── */}
        <Accordion title={hostTitle} icon="👤" color={theme.color}>
          <HostSection owner={property.owner} />
        </Accordion>

        {/* ── 11. Règlement intérieur ── */}
        <Accordion
          title={kind === 'restaurant' ? 'Informations pratiques' : 'Règlement intérieur'}
          icon="📜"
          color={theme.color}
        >
          <RulesSection property={property} />
        </Accordion>

        {/* ── 12. Politique d'annulation ── */}
        <Accordion
          title={kind === 'real_estate' ? 'Conditions' : 'Politique d\'annulation'}
          icon="🔄"
          color={theme.color}
        >
          <CancellationPolicySection property={property} color={theme.color} />
        </Accordion>

        {/* ── 13. Contact / messagerie ── */}
        <Accordion title="Contacter" icon="💬" color={theme.color}>
          <ContactHostSection
            ownerId={property.owner?.id ?? ''}
            ownerName={ownerName}
            propertyId={property.id}
            color={theme.color}
          />
        </Accordion>

        {/* ── 14. FAQ ── */}
        <Accordion title="Questions fréquentes" icon="❓" color={theme.color}>
          <FAQSection property={property} color={theme.color} />
        </Accordion>

        {/* Bottom spacer for sticky CTA */}
        <View style={{ height: 96 }} />
      </ScrollView>

      {/* Sticky price + action CTA */}
      <View style={styles.stickyBar}>
        {kind !== 'restaurant' && (
          <View style={styles.stickyPriceWrap}>
            {priceValue != null && (
              <Text style={[styles.stickyPrice, { color: theme.color }]}>
                {pricePrefix ? `${pricePrefix} ` : ''}{formatPrice(priceValue)}
                {unit ? <Text style={styles.stickyUnit}> {unit}</Text> : null}
              </Text>
            )}
          </View>
        )}
        {kind === 'restaurant' ? (
          <>
            <TouchableOpacity
              style={[styles.stickyCta, { flex: 1, marginRight: 8, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.color }]}
              onPress={handleAction}
              activeOpacity={0.88}
            >
              <Text style={[styles.stickyCtaText, { color: theme.color }]}>🪑 Réserver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stickyCta, { flex: 1, backgroundColor: theme.color }]}
              onPress={handleOrder}
              activeOpacity={0.88}
            >
              <Text style={styles.stickyCtaText}>🛒 Commander</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.stickyCta, { backgroundColor: theme.color }]} onPress={handleAction} activeOpacity={0.88}>
            <Text style={styles.stickyCtaText}>{actionLabel(property.type)}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Booking modal with 3 payment options (hébergements / hôtels) */}
      <BookingModal
        visible={showBooking}
        property={property}
        onClose={() => setShowBooking(false)}
        onConfirm={(checkIn, checkOut, guests) => {
          setShowBooking(false);
          navigation.navigate('Booking', {
            propertyId: property.id,
            checkIn,
            checkOut,
            guests,
            propertyName: property.name,
            pricePerNight: property.pricePerNight ?? undefined,
            mode: 'stay',
          });
        }}
      />

      {/* Réservation de table (restaurants) */}
      <RestaurantReservationModal
        visible={showRestaurant}
        property={property}
        color={theme.color}
        onClose={() => setShowRestaurant(false)}
        onConfirm={(date, time, guests, note) => {
          setShowRestaurant(false);
          // endDate doit être postérieur : on passe le lendemain (non affiché en mode table).
          // addDaysStr retourne null sur une date invalide — repli sur aujourd'hui/demain
          // plutôt que de jeter RangeError: Invalid time value (crash en production).
          const safeDate = addDaysStr(date, 0) ?? todayStr();
          navigation.navigate('Booking', {
            propertyId: property.id,
            checkIn: safeDate,
            checkOut: addDaysStr(safeDate, 1) ?? safeDate,
            guests,
            propertyName: property.name,
            mode: 'table',
            reservationTime: note ? `${time} — ${note}` : time,
          });
        }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F5F7' },
  cacheNotice: { backgroundColor: '#FEF3C7', paddingVertical: 6, paddingHorizontal: 14 },
  cacheNoticeText: { fontSize: 12, color: '#92400E', fontWeight: '500' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 12 },
  errorIcon: { fontSize: 48 },
  errorText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  errorBtn: { backgroundColor: '#1056E0', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  errorBtnText: { color: '#fff', fontWeight: '600' },
  floatingHeader: { position: 'absolute', top: 48, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  headerBtnText: { fontSize: 18, color: '#111827', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20, backgroundColor: '#F4F5F7' },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginTop: 8, backgroundColor: '#fff' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  titleBlock: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, backgroundColor: '#fff' },
  title: { fontSize: 19, fontWeight: '800', color: '#111827', lineHeight: 25 },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  location: { fontSize: 12, color: '#6B7280' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  star: { color: '#F59E0B', fontSize: 13 },
  rating: { fontSize: 13, fontWeight: '700', color: '#111827' },
  reviewCount: { fontSize: 11.5, color: '#6B7280' },

  // En-tête card
  headerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  priceWrap: { flex: 1 },
  pricePrefix: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginBottom: 1 },
  price: { fontSize: 20, fontWeight: '900' },
  priceUnit: { fontSize: 12, color: '#6B7280', marginTop: 1, fontWeight: '600' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  restaurantActions: { gap: 6 },
  orderBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  orderBtnText: { fontSize: 13, fontWeight: '700' },

  vtWrap: { paddingHorizontal: 16, marginTop: 8, marginBottom: 2 },
  videoSection: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  videoCard: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  videoView: { width: '100%', height: 210 },

  // Sticky bottom bar
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  stickyPriceWrap: { flex: 1 },
  stickyPrice: { fontSize: 15, fontWeight: '800' },
  stickyUnit: { fontSize: 11.5, color: '#6B7280', fontWeight: '600' },
  stickyCta: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 },
  stickyCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },

});
