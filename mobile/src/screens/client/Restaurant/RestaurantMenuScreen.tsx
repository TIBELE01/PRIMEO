// Étape 2 du parcours restaurant (client) : tous les menus (plats validés) d'UN
// restaurant, sous forme de cartes, avec filtre par catégorie. Chaque carte mène
// au détail du plat (étape 3). Robuste contre les données manquantes (pas de crash).
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ClientScreenProps, RestaurantDish } from '../../../navigation/types';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';
import { useCurrency } from '../../../hooks/useCurrency';

const PRIMARY = '#DC2626';
const ALL = 'Tout';
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
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => openDish(item)}>
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={styles.cardImg} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImg, styles.cardImgFallback]}><Text style={{ fontSize: 30 }}>🍽️</Text></View>
      )}
      <View style={styles.cardBody}>
        {item.section ? (
          <View style={styles.badge}><Text style={styles.badgeText}>{item.section}</Text></View>
        ) : null}
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
          <View style={styles.detailBtn}>
            <Text style={styles.detailBtnText}>Voir le détail</Text>
            <Ionicons name="chevron-forward" size={14} color={PRIMARY} />
          </View>
        </View>
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
          contentContainerStyle={styles.list}
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
  list: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardImg: { width: 104, height: '100%', minHeight: 104 },
  cardImgFallback: { backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, padding: 12, gap: 4 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.3 },
  cardName: { fontSize: 15, fontWeight: '800', color: '#111827' },
  cardDesc: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: PRIMARY },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailBtnText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
});
