// Étape 2 du parcours restaurant (client) : tous les menus (plats validés) d'UN
// restaurant, présentés en GRILLE 2 colonnes avec des cartes au design IDENTIQUE
// à celui des cartes de propriétés (PropertyCard) — mêmes coins, ombres, polices.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ClientScreenProps, RestaurantDish } from '../../../navigation/types';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';
import { useCurrency } from '../../../hooks/useCurrency';

const PRIMARY = '#DC2626';
const ALL = 'Tout';
const SCREEN_W = Dimensions.get('window').width;
const GRID_CARD_W = (SCREEN_W - 48) / 2;
type Props = ClientScreenProps<'RestaurantMenu'>;

const pickArray = (res: any): any[] => {
  const d = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

export default function RestaurantMenuScreen({ navigation, route }: Props) {
  const { formatPrice } = useCurrency();
  const { propertyId, restaurantName, tableReservationEnabled } = route.params;

  const [menus, setMenus] = useState<RestaurantDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCat, setActiveCat] = useState<string>(ALL);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await restaurantApi.getMenuItems(propertyId);
      setMenus(pickArray(res) as RestaurantDish[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  const categories = [ALL, ...Array.from(new Set(menus.map(m => m.section).filter(Boolean) as string[]))];
  const visible = activeCat === ALL ? menus : menus.filter(m => m.section === activeCat);

  const openDish = (dish: RestaurantDish) => {
    navigation.navigate('DishDetail', { dish, propertyId, restaurantName, tableReservationEnabled });
  };

  const renderCard = ({ item }: { item: RestaurantDish }) => (
    <TouchableOpacity style={[styles.card, { width: GRID_CARD_W }]} activeOpacity={0.9} onPress={() => openDish(item)}>
      {/* Image + overlays (badge catégorie, prix) — comme une carte de propriété */}
      <View style={styles.imgWrap}>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.img} resizeMode="cover" />
        ) : (
          <View style={[styles.img, styles.imgFallback]}><Text style={{ fontSize: 34 }}>🍽️</Text></View>
        )}
        <View style={styles.grad1} />
        <View style={styles.grad2} />
        {item.section ? (
          <View style={styles.badges}><View style={styles.badge}><Text style={styles.badgeTxt}>{item.section}</Text></View></View>
        ) : null}
        <View style={styles.priceWrap}><Text style={styles.priceOnImg}>{formatPrice(item.price)}</Text></View>
      </View>

      {/* Infos sous l'image */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : <Text style={styles.desc} numberOfLines={2}> </Text>}
        <Text style={styles.detailLink}>Voir le détail ›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName ?? 'Menu'}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Filtre par catégorie */}
      {!loading && menus.length > 0 && (
        <View style={styles.filterWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map(cat => {
              const active = cat === activeCat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, active && { backgroundColor: PRIMARY, borderColor: PRIMARY }]}
                  onPress={() => setActiveCat(cat)}
                >
                  <Text style={[styles.chipText, active && { color: '#fff' }]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(d) => d.id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="fast-food-outline" size={44} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                {error ? 'Impossible de charger le menu.' : 'Le menu de ce restaurant sera bientôt disponible.'}
              </Text>
              {error ? <TouchableOpacity style={styles.retryBtn} onPress={load}><Text style={styles.retryText}>Réessayer</Text></TouchableOpacity> : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  retryBtn: { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#111827' },
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: '700', color: '#374151' },

  /* Grille 2 colonnes — mêmes espacements que CategoryScreen */
  gridContent: { paddingTop: 14, paddingBottom: 32 },
  gridRow: { paddingHorizontal: 16, gap: 16, marginBottom: 16 },

  /* Carte — design identique à PropertyCard */
  card: { borderRadius: 20, backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#0F1729', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 8 },
  imgWrap: { height: 140, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  img: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  imgFallback: { backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  grad1: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'rgba(0,0,0,0.42)' },
  grad2: { position: 'absolute', bottom: 30, left: 0, right: 0, height: 40, backgroundColor: 'rgba(0,0,0,0.20)' },
  badges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)', backgroundColor: 'rgba(220,38,38,0.90)' },
  badgeTxt: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  priceWrap: { position: 'absolute', bottom: 10, left: 12 },
  priceOnImg: { fontSize: 15, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  info: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  name: { fontSize: 14, fontWeight: '700', color: '#0F1729', marginBottom: 3, letterSpacing: 0.1 },
  desc: { fontSize: 12, color: '#64748B', marginBottom: 6, fontWeight: '500', lineHeight: 16, minHeight: 32 },
  detailLink: { fontSize: 12.5, fontWeight: '800', color: PRIMARY },
});
