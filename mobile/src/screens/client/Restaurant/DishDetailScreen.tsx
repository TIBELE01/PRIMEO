// Étape 3 du parcours restaurant (client) : fiche détail d'un PLAT, calquée à
// l'identique sur la fiche détail des propriétés (PropertyDetailScreen) — même
// en-tête flottant, même carte média surélevée, mêmes badges, même bloc titre,
// même carte d'en-tête (prix + actions), mêmes sections en accordéon (composants
// réutilisés) et même barre d'action collante. Le contenu est adapté au plat et
// au restaurant ; les sections « restaurant » s'appuient sur la fiche du
// restaurant chargée via usePropertyDetail.
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Share, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ClientScreenProps } from '../../../navigation/types';
import { useCurrency } from '../../../hooks/useCurrency';
import { useAuthStore } from '../../../store/authStore';
import { favoritesApi } from '../../../services/api/endpoints/favorites';
import { usePropertyDetail } from '../PropertyDetail/hooks/usePropertyDetail';
import { themeColor } from '../PropertyDetail/detailContent';
import { ImageGallery } from '../PropertyDetail/components/ImageGallery';
import { Accordion } from '../PropertyDetail/components/Accordion';
import { PresentationSection } from '../PropertyDetail/sections/PresentationSection';
import { TestimonialsCarousel } from '../PropertyDetail/sections/TestimonialsCarousel';
import { LocationSection } from '../PropertyDetail/sections/LocationSection';
import { HostSection } from '../PropertyDetail/sections/HostSection';
import { ContactHostSection } from '../PropertyDetail/sections/ContactHostSection';
import { num } from '@/utils/normalizeProperty';

type Props = ClientScreenProps<'DishDetail'>;

const SCREEN_W = Dimensions.get('window').width;
const MEDIA_CARD_PADDING = 6;
const MEDIA_WIDTH = SCREEN_W - 2 * MEDIA_CARD_PADDING;
const MEDIA_HEIGHT = 290;

export default function DishDetailScreen({ navigation, route }: Props) {
  const { formatPrice } = useCurrency();
  const { dish, propertyId, restaurantName, tableReservationEnabled } = route.params;
  const allergens = dish.allergens ?? [];

  // Fiche du restaurant (avis, localisation, responsable, contact)
  const { property } = usePropertyDetail(propertyId);
  const theme = useMemo(() => themeColor(property?.type ?? 'restaurant'), [property?.type]);

  const isAuthenticated = !!useAuthStore(s => s.accessToken);
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  React.useEffect(() => {
    if (!isAuthenticated || !propertyId) return;
    favoritesApi.list()
      .then(res => {
        const favs: any[] = res?.data?.data ?? res?.data ?? [];
        setIsFav(favs.some(f => f.propertyId === propertyId || f.property?.id === propertyId));
      })
      .catch(() => { /* ignore */ });
  }, [propertyId, isAuthenticated]);

  const handleToggleFavorite = useCallback(async () => {
    if (!isAuthenticated) { Alert.alert('Connexion requise', 'Connectez-vous pour ajouter aux favoris.'); return; }
    if (favLoading) return;
    setFavLoading(true);
    const wasF = isFav;
    setIsFav(!wasF);
    try {
      if (wasF) await favoritesApi.remove(propertyId);
      else await favoritesApi.add(propertyId);
    } catch {
      setIsFav(wasF);
    } finally {
      setFavLoading(false);
    }
  }, [isAuthenticated, favLoading, isFav, propertyId]);

  const handleShare = useCallback(async () => {
    await Share.share({ message: `${dish.name}${restaurantName ? ` — ${restaurantName}` : ''} sur PRIMEO`, title: dish.name });
  }, [dish.name, restaurantName]);

  const goOrder = () => navigation.navigate('DishOrder', { dish, propertyId, restaurantName });
  const goReserve = () => navigation.navigate('TableReservation', { propertyId, restaurantName });

  const images = dish.photoUrl ? [dish.photoUrl] : [];
  const rating = num(property?.rating);
  const reviewCount = num(property?.reviewCount);
  const cuisineType = (property as any)?.cuisineType as string | undefined;

  return (
    <SafeAreaView style={styles.safe} testID="dish-detail-screen">
      <StatusBar barStyle="dark-content" />

      {/* En-tête flottant (retour / favori / partage) — identique aux propriétés */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerBtn} disabled={favLoading}>
            <Text style={[styles.headerBtnText, isFav && { color: '#EF4444' }]}>{isFav ? '♥' : '♡'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Carte média surélevée (photo du plat) ── */}
        <View style={styles.mediaCardOuter}>
          <View style={styles.mediaCardInner}>
            {images.length > 0 ? (
              <ImageGallery images={images} width={MEDIA_WIDTH} height={MEDIA_HEIGHT} />
            ) : (
              <View style={[styles.mediaFallback, { width: MEDIA_WIDTH, height: MEDIA_HEIGHT }]}>
                <Text style={{ fontSize: 72 }}>🍽️</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Badges ── */}
        <View style={styles.badges}>
          {dish.section ? <View style={[styles.badge, { backgroundColor: theme.color }]}><Text style={styles.badgeText}>{dish.section}</Text></View> : null}
          {dish.isAvailable === false
            ? <View style={[styles.badge, { backgroundColor: '#92400E' }]}><Text style={styles.badgeText}>Indisponible</Text></View>
            : <View style={[styles.badge, { backgroundColor: '#16A34A' }]}><Text style={styles.badgeText}>✓ Disponible</Text></View>}
          {cuisineType ? <View style={[styles.badge, { backgroundColor: '#6366F1' }]}><Text style={styles.badgeText}>🍲 {cuisineType}</Text></View> : null}
        </View>

        {/* ── Titre + restaurant + note ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{dish.name}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.location}>🍴 {restaurantName ?? 'Restaurant'}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.star}>★</Text>
              <Text style={styles.rating}>{rating > 0 ? rating.toFixed(1) : 'Nouveau'}</Text>
              {reviewCount > 0 ? <Text style={styles.reviewCount}>({reviewCount} avis)</Text> : null}
            </View>
          </View>
        </View>

        {/* ── En-tête : prix (gauche) + actions (droite) — identique aux propriétés ── */}
        <View style={[styles.headerCard, { borderColor: theme.color }]}>
          <View style={styles.priceWrap}>
            <Text style={styles.pricePrefix}>Prix</Text>
            <Text style={[styles.price, { color: theme.color }]}>{formatPrice(dish.price)}</Text>
          </View>
          {tableReservationEnabled ? (
            <View style={styles.restaurantActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.color }]} onPress={goReserve} activeOpacity={0.88}>
                <Text style={styles.actionBtnText}>Réserver une table</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.orderBtn, { borderColor: theme.color }]} onPress={goOrder} activeOpacity={0.88}>
                <Text style={[styles.orderBtnText, { color: theme.color }]}>🛒 Commander</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.color }]} onPress={goOrder} activeOpacity={0.88}>
              <Text style={styles.actionBtnText}>🛒 Commander</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 1. Description ── */}
        <Accordion title="Description" icon="📝" color={theme.color}>
          <PresentationSection description={dish.description?.trim() || 'Aucune description fournie pour ce plat.'} />
        </Accordion>

        {/* ── 2. Caractéristiques du plat (ouverte par défaut, comme les propriétés) ── */}
        <Accordion title="Caractéristiques" icon="📋" color={theme.color} defaultOpen>
          <View style={styles.kvWrap}>
            <KV k="Catégorie" v={dish.section || '—'} />
            <KV k="Prix" v={formatPrice(dish.price)} />
            <KV k="Disponibilité" v={dish.isAvailable === false ? 'Indisponible' : 'Disponible'} />
            {restaurantName ? <KV k="Restaurant" v={restaurantName} /> : null}
          </View>
        </Accordion>

        {/* ── 3. Ingrédients & allergènes (remplace « Équipements ») ── */}
        <Accordion title="Ingrédients & allergènes" icon="🥗" color={theme.color}>
          {allergens.length > 0 ? (
            <View style={styles.sectionPad}>
              <Text style={styles.bodyLabel}>Allergènes signalés</Text>
              <View style={styles.tagRow}>
                {allergens.map(a => <View key={a} style={styles.tag}><Text style={styles.tagText}>{a}</Text></View>)}
              </View>
            </View>
          ) : (
            <Text style={styles.bodyMuted}>Aucun allergène signalé pour ce plat.</Text>
          )}
        </Accordion>

        {/* ── 4. Informations nutritionnelles ── */}
        <Accordion title="Informations nutritionnelles" icon="🍎" color={theme.color}>
          <Text style={styles.bodyMuted}>Informations nutritionnelles non communiquées par le restaurant pour le moment.</Text>
        </Accordion>

        {/* ── 5. Options & personnalisation (remplace « Règlement intérieur ») ── */}
        <Accordion title="Options & personnalisation" icon="⚙️" color={theme.color} subtitle="Accompagnements, sauces, cuisson">
          <Text style={styles.bodyText}>
            Personnalisez votre plat lors de la commande : quantité, accompagnements, sauces et précisions
            (cuisson, sans oignon…). Vous pourrez tout détailler à l'étape « Commander ».
          </Text>
        </Accordion>

        {/* ── 6. Avis clients ── */}
        <Accordion title="Avis clients" icon="⭐" color={theme.color}>
          <TestimonialsCarousel
            reviewsSummary={property?.reviewsSummary}
            color={theme.color}
            onAddReview={() => Alert.alert('Ajouter un avis', 'Vous pourrez laisser un avis après votre visite au restaurant.')}
          />
        </Accordion>

        {/* ── 7. Localisation du restaurant ── */}
        <Accordion title="Localisation" icon="📍" color={theme.color}>
          <LocationSection
            latitude={property?.latitude ?? null}
            longitude={property?.longitude ?? null}
            city={property?.city ?? restaurantName ?? ''}
            isBooked={false}
            color={theme.color}
          />
        </Accordion>

        {/* ── 8. Le restaurant (responsable) ── */}
        {property?.owner && (
          <Accordion title="Le restaurant" icon="👤" color={theme.color}>
            <HostSection owner={property.owner} />
          </Accordion>
        )}

        {/* ── 9. Contacter ── */}
        <Accordion title="Contacter" icon="💬" color={theme.color}>
          <ContactHostSection
            ownerId={property?.owner?.id ?? ''}
            ownerName={`${property?.owner?.firstName ?? ''} ${property?.owner?.lastName ?? ''}`.trim() || restaurantName || 'Le restaurant'}
            propertyId={propertyId}
            color={theme.color}
          />
        </Accordion>

        {/* Espace pour la barre collante */}
        <View style={{ height: 96 }} />
      </ScrollView>

      {/* ── Barre d'action collante (identique aux propriétés) ── */}
      <View style={styles.stickyBar}>
        {tableReservationEnabled ? (
          <>
            <TouchableOpacity
              style={[styles.stickyCta, { flex: 1, marginRight: 8, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.color }]}
              onPress={goReserve}
              activeOpacity={0.88}
            >
              <Text style={[styles.stickyCtaText, { color: theme.color }]}>🪑 Réserver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stickyCta, { flex: 1, backgroundColor: theme.color }, dish.isAvailable === false && { opacity: 0.5 }]}
              onPress={goOrder}
              disabled={dish.isAvailable === false}
              activeOpacity={0.88}
            >
              <Text style={styles.stickyCtaText}>🛒 Commander</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.stickyCta, { flex: 1, backgroundColor: theme.color }, dish.isAvailable === false && { opacity: 0.5 }]}
            onPress={goOrder}
            disabled={dish.isAvailable === false}
            activeOpacity={0.88}
          >
            <Text style={styles.stickyCtaText}>🛒 Commander</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

// Styles repris à l'identique de PropertyDetailScreen (mêmes valeurs).
const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#F4F5F7' },
  floatingHeader: { position: 'absolute', top: 48, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  headerBtnText: { fontSize: 18, color: '#111827', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20, backgroundColor: '#F4F5F7' },

  mediaCardOuter: { marginHorizontal: 0, marginTop: 14, marginBottom: 6, padding: MEDIA_CARD_PADDING, backgroundColor: '#000', borderRadius: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 12 },
  mediaCardInner: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#0B1220' },
  mediaFallback: { backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },

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
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  restaurantActions: { gap: 6 },
  orderBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  orderBtnText: { fontSize: 13, fontWeight: '700' },

  // Contenu spécifique plat
  sectionPad: { paddingHorizontal: 16, paddingBottom: 12 },
  kvWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F0' },
  kvKey: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  kvVal: { fontSize: 13, color: '#111827', fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  bodyText: { fontSize: 14, color: '#374151', lineHeight: 21, paddingHorizontal: 16, paddingBottom: 12 },
  bodyMuted: { fontSize: 13, color: '#9CA3AF', paddingHorizontal: 16, paddingBottom: 12 },
  bodyLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 12, color: '#374151', fontWeight: '600' },

  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  stickyCta: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  stickyCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
