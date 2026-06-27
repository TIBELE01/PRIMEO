// Étape 3 du parcours restaurant (client) : fiche détail d'un plat.
// Photo en grand, description complète, prix, allergènes, puis deux actions :
// « Commander » (étape 4) et « Réserver une table » (étape 4 bis, si activée).
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ClientScreenProps } from '../../../navigation/types';
import { useCurrency } from '../../../hooks/useCurrency';

const PRIMARY = '#DC2626';
type Props = ClientScreenProps<'DishDetail'>;

export default function DishDetailScreen({ navigation, route }: Props) {
  const { formatPrice } = useCurrency();
  const { dish, propertyId, restaurantName, tableReservationEnabled } = route.params;
  const allergens = dish.allergens ?? [];

  const goOrder = () => navigation.navigate('DishOrder', { dish, propertyId, restaurantName });
  const goReserve = () => navigation.navigate('TableReservation', { propertyId, restaurantName });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName ?? 'Détail du plat'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {dish.photoUrl ? (
          <Image source={{ uri: dish.photoUrl }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, styles.heroFallback]}><Text style={{ fontSize: 64 }}>🍽️</Text></View>
        )}

        <View style={styles.body}>
          {dish.section ? (
            <View style={styles.badge}><Text style={styles.badgeText}>{dish.section}</Text></View>
          ) : null}
          <Text style={styles.name}>{dish.name}</Text>
          <Text style={styles.price}>{formatPrice(dish.price)}</Text>

          {dish.isAvailable === false && (
            <View style={styles.unavailable}>
              <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
              <Text style={styles.unavailableText}>Ce plat est actuellement indisponible.</Text>
            </View>
          )}

          {dish.description ? (
            <>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.desc}>{dish.description}</Text>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Informations</Text>
          {allergens.length > 0 ? (
            <>
              <Text style={styles.infoLabel}>Allergènes</Text>
              <View style={styles.tagRow}>
                {allergens.map(a => (
                  <View key={a} style={styles.tag}><Text style={styles.tagText}>{a}</Text></View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.infoMuted}>Aucun allergène signalé pour ce plat.</Text>
          )}
        </View>
      </ScrollView>

      {/* Actions principales */}
      <View style={styles.footer}>
        {tableReservationEnabled && (
          <TouchableOpacity style={[styles.footerBtn, styles.reserveBtn]} onPress={goReserve} activeOpacity={0.88}>
            <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
            <Text style={[styles.footerBtnText, { color: PRIMARY }]}>Réserver une table</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.footerBtn, styles.orderBtn, dish.isAvailable === false && { opacity: 0.5 }]}
          onPress={goOrder}
          disabled={dish.isAvailable === false}
          activeOpacity={0.88}
        >
          <Ionicons name="cart-outline" size={18} color="#fff" />
          <Text style={[styles.footerBtnText, { color: '#fff' }]}>Commander</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#111827' },
  hero: { width: '100%', height: 260 },
  heroFallback: { backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, gap: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '800', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.4 },
  name: { fontSize: 24, fontWeight: '900', color: '#111827', marginTop: 4 },
  price: { fontSize: 20, fontWeight: '800', color: PRIMARY },
  unavailable: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginTop: 6 },
  unavailableText: { fontSize: 13, color: '#92400E', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 16 },
  desc: { fontSize: 14, color: '#374151', lineHeight: 21 },
  infoLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginTop: 4 },
  infoMuted: { fontSize: 13, color: '#9CA3AF' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 14, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 12 },
  reserveBtn: { borderWidth: 1.5, borderColor: PRIMARY, backgroundColor: '#fff' },
  orderBtn: { backgroundColor: PRIMARY },
  footerBtnText: { fontSize: 15, fontWeight: '700' },
});
