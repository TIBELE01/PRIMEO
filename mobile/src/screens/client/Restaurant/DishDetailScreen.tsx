// Étape 3 du parcours restaurant (client) : fiche détail d'un plat, avec la MÊME
// structure et le MÊME design que la fiche détail des propriétés (PropertyDetail) :
// image en haut, badges, titre, carte prix, sections en accordéon, barre d'action
// collante. Boutons « Commander » et « Réserver une table » (si activée).
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ClientScreenProps } from '../../../navigation/types';
import { useCurrency } from '../../../hooks/useCurrency';
import { Accordion } from '../PropertyDetail/components/Accordion';

const THEME = '#DC2626';
type Props = ClientScreenProps<'DishDetail'>;

export default function DishDetailScreen({ navigation, route }: Props) {
  const { formatPrice } = useCurrency();
  const { dish, propertyId, restaurantName, tableReservationEnabled } = route.params;
  const allergens = dish.allergens ?? [];

  const goOrder = () => navigation.navigate('DishOrder', { dish, propertyId, restaurantName });
  const goReserve = () => navigation.navigate('TableReservation', { propertyId, restaurantName });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        {/* ── Média (image en haut) ── */}
        <View style={styles.mediaWrap}>
          {dish.photoUrl ? (
            <Image source={{ uri: dish.photoUrl }} style={styles.media} resizeMode="cover" />
          ) : (
            <View style={[styles.media, styles.mediaFallback]}><Text style={{ fontSize: 64 }}>🍽️</Text></View>
          )}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle} hitSlop={12} accessibilityLabel="Retour">
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        </View>

        {/* ── Badges ── */}
        <View style={styles.badges}>
          {dish.section ? <View style={[styles.badge, { backgroundColor: THEME }]}><Text style={styles.badgeText}>{dish.section}</Text></View> : null}
          {dish.isAvailable === false
            ? <View style={[styles.badge, { backgroundColor: '#92400E' }]}><Text style={styles.badgeText}>Indisponible</Text></View>
            : <View style={[styles.badge, { backgroundColor: '#16A34A' }]}><Text style={styles.badgeText}>✓ Disponible</Text></View>}
        </View>

        {/* ── Titre ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{dish.name}</Text>
          {restaurantName ? (
            <View style={styles.locationRow}>
              <Text style={styles.location}>🍴 {restaurantName}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Carte prix ── */}
        <View style={[styles.headerCard, { borderColor: THEME }]}>
          <View style={styles.priceWrap}>
            <Text style={styles.pricePrefix}>Prix</Text>
            <Text style={[styles.price, { color: THEME }]}>{formatPrice(dish.price)}</Text>
          </View>
        </View>

        {/* ── Sections (accordéons identiques aux propriétés) ── */}
        <Accordion title="Description" icon="📝" color={THEME} defaultOpen>
          <Text style={styles.bodyText}>{dish.description?.trim() || 'Aucune description fournie pour ce plat.'}</Text>
        </Accordion>

        <Accordion title="Ingrédients & allergènes" icon="🥗" color={THEME}>
          {allergens.length > 0 ? (
            <>
              <Text style={styles.bodyLabel}>Allergènes signalés</Text>
              <View style={styles.tagRow}>
                {allergens.map(a => <View key={a} style={styles.tag}><Text style={styles.tagText}>{a}</Text></View>)}
              </View>
            </>
          ) : (
            <Text style={styles.bodyMuted}>Aucun allergène signalé pour ce plat.</Text>
          )}
        </Accordion>

        <Accordion title="Informations nutritionnelles" icon="🍎" color={THEME}>
          <Text style={styles.bodyMuted}>Non communiquées par le restaurant pour le moment.</Text>
        </Accordion>

        <Accordion title="Options & personnalisation" icon="⚙️" color={THEME}>
          <Text style={styles.bodyText}>
            Personnalisez votre plat lors de la commande : quantité, accompagnements, sauces et précisions
            (cuisson, sans oignon…).
          </Text>
        </Accordion>
      </ScrollView>

      {/* ── Barre d'action collante (comme PropertyDetail) ── */}
      <View style={styles.stickyBar}>
        {tableReservationEnabled && (
          <TouchableOpacity
            style={[styles.stickyCta, { flex: 1, marginRight: 8, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: THEME }]}
            onPress={goReserve}
            activeOpacity={0.88}
          >
            <Text style={[styles.stickyCtaText, { color: THEME }]}>🪑 Réserver</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.stickyCta, { flex: 1, backgroundColor: THEME }, dish.isAvailable === false && { opacity: 0.5 }]}
          onPress={goOrder}
          disabled={dish.isAvailable === false}
          activeOpacity={0.88}
        >
          <Text style={styles.stickyCtaText}>🛒 Commander</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  mediaWrap: { width: '100%', height: 280 },
  media: { width: '100%', height: '100%' },
  mediaFallback: { backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  backCircle: { position: 'absolute', top: 12, left: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 20, color: '#fff', fontWeight: '300', lineHeight: 24 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginTop: 10, backgroundColor: '#F9FAFB' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  titleBlock: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 19, fontWeight: '800', color: '#111827', lineHeight: 25 },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  location: { fontSize: 12, color: '#6B7280' },

  headerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 10, marginBottom: 8,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  priceWrap: { flex: 1 },
  pricePrefix: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginBottom: 1 },
  price: { fontSize: 20, fontWeight: '900' },

  bodyText: { fontSize: 14, color: '#374151', lineHeight: 21, paddingHorizontal: 16, paddingBottom: 12 },
  bodyMuted: { fontSize: 13, color: '#9CA3AF', paddingHorizontal: 16, paddingBottom: 12 },
  bodyLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', paddingHorizontal: 16, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  tag: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 12, color: '#374151', fontWeight: '600' },

  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  stickyCta: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  stickyCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
