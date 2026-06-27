// Étape 1 du parcours restaurant (client) : liste des restaurants sous forme de cartes.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ClientScreenProps } from '../../../navigation/types';
import { propertiesApi } from '../../../services/api/endpoints/properties';

const PRIMARY = '#DC2626';
type Props = ClientScreenProps<'RestaurantsList'>;

interface Resto {
  id: string;
  name?: string; title?: string;
  city?: string;
  cuisineType?: string;
  mainImageUrl?: string | null;
  images?: Array<{ url: string }>;
  rating?: number | string;          // Prisma Decimal → peut arriver en chaîne
  reviewCount?: number;
  reviewsSummary?: { average?: number | string; count?: number };
  reviewsCount?: number;
  tableReservationEnabled?: boolean;
}

const pickArray = (res: any): any[] => {
  const d = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.properties)) return d.properties;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

export default function RestaurantsListScreen({ navigation }: Props) {
  const [restaurants, setRestaurants] = useState<Resto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError(false);
    try {
      const res = await propertiesApi.search({ propertyType: 'restaurant', limit: 50 });
      setRestaurants(pickArray(res) as Resto[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openMenu = (r: Resto) => {
    navigation.navigate('RestaurantMenu', {
      propertyId: r.id,
      restaurantName: r.title ?? r.name ?? 'Restaurant',
      tableReservationEnabled: !!r.tableReservationEnabled,
    });
  };

  const renderCard = ({ item }: { item: Resto }) => {
    const name = item.title ?? item.name ?? 'Restaurant';
    const img = item.mainImageUrl ?? item.images?.[0]?.url ?? null;
    // rating peut être un nombre, une chaîne (Decimal sérialisé), null ou undefined.
    const ratingNum = Number(item.rating ?? item.reviewsSummary?.average ?? 0);
    const hasRating = Number.isFinite(ratingNum) && ratingNum > 0;
    const reviews = Number(item.reviewCount ?? item.reviewsCount ?? item.reviewsSummary?.count ?? 0) || 0;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => openMenu(item)}>
        {img ? (
          <Image source={{ uri: img }} style={styles.cardImg} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImg, styles.cardImgFallback]}><Text style={{ fontSize: 40 }}>🍽️</Text></View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
          <View style={styles.cardMetaRow}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.cardMeta}>{hasRating ? ratingNum.toFixed(1) : 'Nouveau'}{reviews ? ` (${reviews})` : ''}</Text>
            {item.cuisineType ? <Text style={styles.cardDot}>·</Text> : null}
            {item.cuisineType ? <Text style={styles.cardMeta} numberOfLines={1}>🍲 {item.cuisineType}</Text> : null}
          </View>
          {item.city ? <Text style={styles.cardCity} numberOfLines={1}>📍 {item.city}</Text> : null}
          <View style={styles.cardCta}>
            <Text style={styles.cardCtaText}>Voir le menu</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header navigation={navigation} />
        <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header navigation={navigation} />
      <FlatList
        data={restaurants}
        keyExtractor={(r) => r.id}
        renderItem={renderCard}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={PRIMARY} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="restaurant-outline" size={44} color="#9CA3AF" />
            <Text style={styles.emptyText}>{error ? 'Impossible de charger les restaurants.' : 'Aucun restaurant disponible pour le moment.'}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => load()}><Text style={styles.retryText}>Réessayer</Text></TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Header({ navigation }: { navigation: Props['navigation'] }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
        <Ionicons name="chevron-back" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Restaurants</Text>
      <View style={{ width: 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyText: { color: '#6B7280', textAlign: 'center', fontSize: 15 },
  retryBtn: { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#111827' },
  list: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  cardImg: { width: '100%', height: 150 },
  cardImgFallback: { backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 14, gap: 6 },
  cardName: { fontSize: 17, fontWeight: '800', color: '#111827' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  cardMeta: { fontSize: 13, color: '#374151', fontWeight: '600' },
  cardDot: { color: '#9CA3AF', marginHorizontal: 2 },
  cardCity: { fontSize: 12, color: '#6B7280' },
  cardCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 11, marginTop: 6 },
  cardCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
