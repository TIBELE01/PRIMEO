import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '@navigation/types';
import { propertiesApi } from '@services/api/endpoints/properties';
import type { Property } from '@/types/property';
import { normalizeProperties } from '@/utils/normalizeProperty';
import { PropertyCard } from '../Home/PropertyCard';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

const SECTOR_META: Record<string, { icon: string; color: string; description: string; sortOptions: string[] }> = {
  apartment: {
    icon: '🏡',
    color: '#1B5E20',
    description: 'Résidences meublées, appartements et villas confortables pour courts et longs séjours.',
    sortOptions: ['rating', 'price_asc', 'price_desc', 'newest'],
  },
  hotel: {
    icon: '🏨',
    color: '#0D47A1',
    description: 'Hôtels, guesthouses et auberges de qualité, partout en Côte d\'Ivoire.',
    sortOptions: ['rating', 'price_asc', 'price_desc', 'newest'],
  },
  real_estate: {
    icon: '🏢',
    color: '#4A148C',
    description: 'Locations, ventes et terrains – l\'immobilier ivoirien réuni en un seul endroit.',
    sortOptions: ['price_asc', 'price_desc', 'newest', 'rating'],
  },
  restaurant: {
    icon: '🍽️',
    color: '#B71C1C',
    description: 'Restaurants, maquis et tables gastronomiques — réservez votre table en quelques secondes.',
    sortOptions: ['rating', 'newest', 'price_asc'],
  },
};

const SORT_LABELS: Record<string, string> = {
  rating: '⭐ Note',
  price_asc: '↑ Prix',
  price_desc: '↓ Prix',
  newest: '🆕 Récents',
  distance: '📍 Distance',
};

export function SectorScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { sectorType = 'apartment', title = 'Explorer' } =
    (route.params ?? {}) as { sectorType?: string; title?: string };

  const meta = SECTOR_META[sectorType] ?? SECTOR_META.apartment;

  const [results, setResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState(meta.sortOptions[0] ?? null);
  const [search, setSearch] = useState('');

  const load = useCallback(async (p = 1, sort = sortBy, q = search) => {
    setLoading(true);
    try {
      const res = await propertiesApi.search({
        type: sectorType,
        sortBy: sort,
        page: p,
        limit: 20,
        ...(q && { city: q }),
      });
      const data = res.data?.data;
      const items: Property[] = normalizeProperties(data?.properties ?? data ?? []);
      if (p === 1) {
        setResults(items);
        setTotal(data?.total ?? items.length);
      } else {
        setResults(prev => [...prev, ...items]);
        setTotal(data?.total ?? items.length);
      }
      setPage(p);
    } catch {
      if (p === 1) setResults([]);
    } finally {
      setLoading(false);
    }
  }, [sectorType, sortBy, search]);

  useEffect(() => { load(1); }, []);

  const handleSort = (s: string) => {
    setSortBy(s);
    load(1, s, search);
  };

  const handleSearch = () => load(1, sortBy, search);

  const goProperty = (id: string) =>
    navigation.navigate('PropertyDetail', { propertyId: id });

  const goAdvancedSearch = () =>
    navigation.navigate('Search', { type: sectorType });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={meta.color} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: meta.color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>{meta.icon}</Text>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <TouchableOpacity onPress={goAdvancedSearch} hitSlop={12}>
          <Text style={styles.filterBtn}>Filtres</Text>
        </TouchableOpacity>
      </View>

      {/* Description */}
      <View style={[styles.descBanner, { backgroundColor: meta.color + '18' }]}>
        <Text style={styles.descText}>{meta.description}</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchField}
            value={search}
            onChangeText={setSearch}
            placeholder="Ville ou quartier…"
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
        </View>
      </View>

      {/* Sort chips */}
      <View style={styles.sortRow}>
        {meta.sortOptions.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.sortChip, sortBy === s && { backgroundColor: meta.color, borderColor: meta.color }]}
            onPress={() => handleSort(s)}
          >
            <Text style={[styles.sortChipText, sortBy === s && styles.sortChipTextActive]}>
              {SORT_LABELS[s] ?? s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {loading && page === 1
            ? 'Chargement…'
            : `${total} résultat${total !== 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={results}
        keyExtractor={(p, i) => p.id ?? String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            onPress={() => goProperty(item.id)}
            style={styles.card}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={meta.color} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{meta.icon}</Text>
              <Text style={styles.emptyTitle}>Aucun résultat</Text>
              <Text style={styles.emptyText}>
                Aucune annonce disponible pour l'instant dans cette catégorie.
              </Text>
            </View>
          )
        }
        onEndReached={() => {
          if (!loading && results.length < total) load(page + 1);
        }}
        onEndReachedThreshold={0.3}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: {},
  backArrow: { fontSize: 22, color: '#fff', fontWeight: '300' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIcon: { fontSize: 20 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  filterBtn: { fontSize: 13, color: '#fff', fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  descBanner: { paddingHorizontal: 16, paddingVertical: 10 },
  descText: { fontSize: 13, color: '#374151', lineHeight: 18 },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  searchIcon: { fontSize: 16 },
  searchField: { flex: 1, fontSize: 14, color: '#111827' },
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  sortChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  sortChipTextActive: { color: '#fff' },
  countRow: { paddingHorizontal: 16, paddingBottom: 6 },
  countText: { fontSize: 12, color: '#6B7280' },
  list: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { width: '100%' },
  empty: { alignItems: 'center', marginTop: 64, gap: 10, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
