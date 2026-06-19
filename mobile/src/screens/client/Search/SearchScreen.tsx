import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, StatusBar, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '@navigation/types';
import { propertiesApi } from '@services/api/endpoints/properties';
import { favoritesApi } from '@services/api/endpoints/favorites';
import { useAuthStore } from '@store/authStore';
import type { Property, PropertyType } from '@/types/property';
import { normalizeProperties } from '@/utils/normalizeProperty';
import { safeJsonParse } from '@/utils/safeJson';
import { useDebounce } from '@hooks/useDebounce';
import { useOffline } from '@hooks/useOffline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropertyCard } from '../Home/PropertyCard';
import { FilterSheet, type FilterValues } from './FilterSheet';
import { SortSheet } from './SortSheet';
import { SearchMapView } from './MapView';
import { NetworkStatus } from '../../../components/common/NetworkStatus';
import { DarkCalendarModal } from '../../../components/common/DarkCalendarModal';
import { trackEvent } from '../../../services/analytics';

type Nav = NativeStackNavigationProp<ClientStackParamList>;

const GEOAPIFY_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_KEY ?? '';
const SEARCH_CACHE_KEY = '@primeo_search_cache';

interface GeoapifySuggestion {
  id: string; label: string; city: string; lat: number; lon: number;
}

const PROPERTY_TYPES: { label: string; value: PropertyType | '' }[] = [
  { label: 'Tous', value: '' },
  { label: 'Résidences', value: 'apartment' },
  { label: 'Hôtels', value: 'hotel' },
  { label: 'Immobilier', value: 'real_estate' },
  { label: 'Restaurants', value: 'restaurant' },
  { label: 'Villas', value: 'villa' },
];


// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  if (!d) return null;
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();

  const [destination, setDestination] = useState<string>(route.params?.query ?? '');
  const [selectedType, setSelectedType] = useState<PropertyType | ''>(route.params?.type ?? '');
  const [guests, setGuests] = useState<number>(route.params?.guests ?? 1);
  const [checkIn, setCheckIn] = useState<string>(route.params?.checkIn ?? '');
  const [checkOut, setCheckOut] = useState<string>(route.params?.checkOut ?? '');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  const [suggestions, setSuggestions] = useState<GeoapifySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const [results, setResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isFromCache, setIsFromCache] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const isOffline = useOffline();
  const accessToken     = useAuthStore(s => s.accessToken);
  const isAuthenticated = !!accessToken;
  const debouncedDestination = useDebounce(destination, 350);

  // ── Chargement des favoris ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || isOffline) return;
    favoritesApi.list()
      .then(res => {
        const data: any[] = res?.data?.data ?? res?.data ?? [];
        setFavoriteIds(new Set(data.map((f: any) => f.propertyId ?? f.property?.id)));
      })
      .catch(() => { /* ignore */ });
  }, [isAuthenticated, isOffline]);

  const toggleFavorite = useCallback(async (propertyId: string) => {
    if (!isAuthenticated) return;
    const alreadyFav = favoriteIds.has(propertyId);
    setFavoriteIds(prev => {
      const next = new Set(prev);
      alreadyFav ? next.delete(propertyId) : next.add(propertyId);
      return next;
    });
    try {
      if (alreadyFav) await favoritesApi.remove(propertyId);
      else await favoritesApi.add(propertyId);
    } catch {
      // Rollback si erreur API
      setFavoriteIds(prev => {
        const next = new Set(prev);
        alreadyFav ? next.add(propertyId) : next.delete(propertyId);
        return next;
      });
    }
  }, [favoriteIds, isAuthenticated]);

  // ── Geoapify autocomplete ─────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedDestination || debouncedDestination.length < 2) { setSuggestions([]); return; }
    fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(debouncedDestination)}&apiKey=${GEOAPIFY_KEY}&lang=fr&limit=5&type=city`)
      .then(r => r.json())
      .then(json => {
        const feats: GeoapifySuggestion[] = (json.features ?? []).map((f: any) => ({
          id: f.properties.place_id ?? String(Math.random()),
          label: f.properties.formatted ?? '',
          city: f.properties.city ?? f.properties.county ?? '',
          lat: f.properties.lat,
          lon: f.properties.lon,
        }));
        setSuggestions(feats);
        setShowSuggestions(feats.length > 0);
      })
      .catch(() => setSuggestions([]));
  }, [debouncedDestination]);

  // ── Geolocation ──────────────────────────────────────────────────────────
  const handleGeolocate = useCallback(async () => {
    setGeoLoading(true);
    try {
      if (Platform.OS === 'web') {
        if (!navigator?.geolocation) return;
        navigator.geolocation.getCurrentPosition(async pos => {
          const { latitude: lat, longitude: lon } = pos.coords;
          const r = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_KEY}&lang=fr`);
          const json = await r.json();
          const city = json.features?.[0]?.properties?.city ?? '';
          if (city) { setDestination(city); setShowSuggestions(false); }
          setGeoLoading(false);
        }, () => setGeoLoading(false));
      } else {
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        const { latitude: lat, longitude: lon } = pos.coords;
        const r = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_KEY}&lang=fr`);
        const json = await r.json();
        const city = json.features?.[0]?.properties?.city ?? '';
        if (city) { setDestination(city); setShowSuggestions(false); }
      }
    } catch { /* permission denied */ } finally { setGeoLoading(false); }
  }, []);

  // ── Cache ────────────────────────────────────────────────────────────────
  const loadCachedResults = useCallback(async () => {
    const raw = await AsyncStorage.getItem(SEARCH_CACHE_KEY).catch(() => null);
    if (!raw) return false;
    const cached = safeJsonParse<{ items?: unknown; total?: number } | null>(raw, null);
    if (!cached) return false;
    setResults(normalizeProperties(cached.items ?? []));
    setTotal(cached.total ?? 0);
    setIsFromCache(true);
    return true;
  }, []);

  // ── Search ───────────────────────────────────────────────────────────────
  const search = useCallback(async (p = 1) => {
    if (isOffline) { if (p === 1) await loadCachedResults(); return; }
    setIsFromCache(false);
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        sortBy, page: p, limit: 20,
        ...(destination && { city: destination }),
        ...(selectedType && { type: selectedType }),
        ...(guests > 1 && { guests }),
        ...(checkIn && { checkIn }),
        ...(checkOut && { checkOut }),
        ...(filterValues.minPrice && { minPrice: filterValues.minPrice }),
        ...(filterValues.maxPrice && { maxPrice: filterValues.maxPrice }),
        ...(filterValues.minRating && { minRating: filterValues.minRating }),
        ...(filterValues.amenities?.length && { amenities: filterValues.amenities.join(',') }),
        ...(filterValues.rules?.length && { rules: filterValues.rules.join(',') }),
        ...(filterValues.cuisineType && { cuisineType: filterValues.cuisineType }),
        ...(filterValues.maxDistance && { maxDistance: filterValues.maxDistance }),
        ...(filterValues.timeSlot && { timeSlot: filterValues.timeSlot }),
      };
      const res = await propertiesApi.search(params);
      // Statistique anonyme de recherche (uniquement la première page)
      if (p === 1) trackEvent('search');
      const data = (res.data as any)?.data;
      const items: Property[] = normalizeProperties(data?.properties ?? data ?? []);
      if (p === 1) {
        setResults(items);
        const t = data?.total ?? items.length;
        setTotal(t);
        AsyncStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify({ items, total: t })).catch(() => null);
      } else {
        setResults(prev => [...prev, ...items]);
        setTotal(data?.total ?? items.length);
      }
      setPage(p);
    } catch {
      if (p === 1) { const ok = await loadCachedResults(); if (!ok) setResults([]); }
    } finally { setLoading(false); }
  }, [destination, selectedType, guests, checkIn, checkOut, sortBy, filterValues, isOffline, loadCachedResults]);

  useEffect(() => { search(1); }, [search]);

  const activeFilterCount = Object.values(filterValues).filter(v =>
    v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  ).length;

  const goProperty = (id: string) => navigation.navigate('PropertyDetail', { propertyId: id });

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <NetworkStatus />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour">
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} accessibilityRole="header">Recherche avancée</Text>
      </View>

      {/* Search box */}
      <View style={s.searchBox}>
        {/* Destination + géolocalisation */}
        <View style={s.inputRow}>
          <Text style={s.inputIcon}>📍</Text>
          <TextInput
            testID="search-bar"
            style={s.input}
            value={destination}
            onChangeText={t => { setDestination(t); setShowSuggestions(true); }}
            placeholder="Ville ou destination…"
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={() => { setShowSuggestions(false); search(1); }}
            accessibilityLabel="Ville ou destination"
          />
          {destination.length > 0 ? (
            <TouchableOpacity onPress={() => { setDestination(''); setSuggestions([]); }} accessibilityRole="button" accessibilityLabel="Effacer la destination">
              <Text style={s.clearBtn}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleGeolocate} disabled={geoLoading} hitSlop={8} accessibilityRole="button" accessibilityLabel="Utiliser ma position actuelle">
              <Text style={s.geoBtn}>{geoLoading ? '⏳' : '📡'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Autocomplete */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={s.suggestions}>
            {suggestions.map(sg => (
              <TouchableOpacity
                key={sg.id}
                style={s.suggestion}
                onPress={() => { setDestination(sg.city || sg.label); setShowSuggestions(false); }}
              >
                <Text style={s.suggestionIcon}>📍</Text>
                <Text style={s.suggestionText} numberOfLines={1}>{sg.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Dates + voyageurs */}
        <View style={s.datesRow}>
          <TouchableOpacity
            style={s.dateBtn}
            onPress={() => setShowCheckIn(true)}
            accessibilityRole="button"
            accessibilityLabel={checkIn ? `Date d'arrivée : ${fmtDate(checkIn)}` : "Choisir la date d'arrivée"}
          >
            <Text style={s.dateBtnLabel}>Arrivée</Text>
            <Text style={[s.dateBtnValue, !checkIn && s.datePlaceholder]}>
              {checkIn ? fmtDate(checkIn) : 'Choisir'}
            </Text>
          </TouchableOpacity>

          <View style={s.dateDivider} />

          <TouchableOpacity
            style={s.dateBtn}
            onPress={() => setShowCheckOut(true)}
            accessibilityRole="button"
            accessibilityLabel={checkOut ? `Date de départ : ${fmtDate(checkOut)}` : 'Choisir la date de départ'}
          >
            <Text style={s.dateBtnLabel}>Départ</Text>
            <Text style={[s.dateBtnValue, !checkOut && s.datePlaceholder]}>
              {checkOut ? fmtDate(checkOut) : 'Choisir'}
            </Text>
          </TouchableOpacity>

          <View style={s.dateDivider} />

          <View style={s.guestsInline}>
            <Text style={s.dateBtnLabel}>Voyageurs</Text>
            <View style={s.guestsCounter} accessibilityLabel={`${guests} voyageur${guests > 1 ? 's' : ''}`}>
              <TouchableOpacity style={s.cBtn} onPress={() => setGuests(g => Math.max(1, g - 1))} accessibilityRole="button" accessibilityLabel="Retirer un voyageur">
                <Text style={s.cBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.guestsCount}>{guests}</Text>
              <TouchableOpacity style={s.cBtn} onPress={() => setGuests(g => g + 1)} accessibilityRole="button" accessibilityLabel="Ajouter un voyageur">
                <Text style={s.cBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {(checkIn || checkOut) && (
          <TouchableOpacity onPress={() => { setCheckIn(''); setCheckOut(''); }}>
            <Text style={s.clearDates}>✕ Effacer les dates</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Type chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeBar} contentContainerStyle={s.typeBarContent}>
        {PROPERTY_TYPES.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[s.typeChip, selectedType === t.value && s.typeChipActive]}
            onPress={() => setSelectedType(t.value as PropertyType | '')}
            accessibilityRole="button"
            accessibilityLabel={`Type : ${t.label}`}
            accessibilityState={{ selected: selectedType === t.value }}
          >
            <Text style={[s.typeChipText, selectedType === t.value && s.typeChipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Toolbar */}
      <View style={s.toolbar}>
        <Text style={s.resultCount}>
          {loading ? 'Recherche…' : `${total} résultat${total !== 1 ? 's' : ''}${isFromCache ? ' (hors ligne)' : ''}`}
        </Text>
        <View style={s.toolbarActions}>
          <TouchableOpacity
            style={[s.toolBtn, activeFilterCount > 0 && s.toolBtnActive, isOffline && s.toolBtnDisabled]}
            onPress={() => !isOffline && setShowFilter(true)}
            accessibilityRole="button"
            accessibilityLabel={`Filtres${activeFilterCount > 0 ? `, ${activeFilterCount} actifs` : ''}`}
          >
            <Text style={[s.toolBtnText, activeFilterCount > 0 && s.toolBtnTextActive]}>
              ⚙ Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toolBtn, isOffline && s.toolBtnDisabled]} onPress={() => !isOffline && setShowSort(true)} accessibilityRole="button" accessibilityLabel="Trier les résultats">
            <Text style={s.toolBtnText}>↕ Trier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.viewToggle, viewMode === 'map' && s.viewToggleActive]}
            onPress={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
            accessibilityRole="button"
            accessibilityLabel={viewMode === 'list' ? 'Afficher la carte' : 'Afficher la liste'}
          >
            <Text style={[s.viewToggleText, viewMode === 'map' && s.viewToggleTextActive]}>
              {viewMode === 'list' ? '🗺 Carte' : '☰ Liste'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      {viewMode === 'map' ? (
        <SearchMapView properties={results} onMarkerPress={goProperty} />
      ) : (
        <FlatList
          testID="search-results"
          data={results}
          keyExtractor={(p, i) => p.id ?? String(i)}
          contentContainerStyle={s.list}
          renderItem={({ item, index }) => (
            <PropertyCard
              testID={`property-card-${index}`}
              property={item}
              onPress={() => goProperty(item.id)}
              style={s.listCard}
              onFavorite={() => toggleFavorite(item.id)}
              isFavorite={favoriteIds.has(item.id)}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color="#1056E0" style={{ marginTop: 48 }} />
            ) : (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>🔍</Text>
                <Text style={s.emptyTitle}>Aucun résultat</Text>
                <Text style={s.emptyText}>Modifiez vos critères de recherche</Text>
              </View>
            )
          }
          onEndReached={() => { if (!loading && results.length < total) search(page + 1); }}
          onEndReachedThreshold={0.3}
        />
      )}

      {/* Filter sheet */}
      <FilterSheet
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        values={filterValues}
        sectorType={selectedType || undefined}
        onApply={vals => { setFilterValues(vals); setShowFilter(false); }}
        onReset={() => { setFilterValues({}); setShowFilter(false); }}
      />

      {/* Sort sheet */}
      <SortSheet
        visible={showSort}
        onClose={() => setShowSort(false)}
        selected={sortBy}
        onSelect={s2 => { setSortBy(s2); setShowSort(false); }}
      />

      {/* Date modals — calendrier sombre */}
      <DarkCalendarModal
        visible={showCheckIn}
        mode="checkin"
        onClose={() => setShowCheckIn(false)}
        onConfirm={(d) => { setCheckIn(d); if (checkOut && d >= checkOut) setCheckOut(''); }}
      />
      <DarkCalendarModal
        visible={showCheckOut}
        mode="checkout"
        existingCheckIn={checkIn || null}
        onClose={() => setShowCheckOut(false)}
        onConfirm={(d) => { setCheckOut(d); if (checkIn && d <= checkIn) setCheckIn(''); }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 52, paddingTop: 16, paddingBottom: 16, backgroundColor: '#808080',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E2E6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 8, zIndex: 10,
  },
  backBtn: { position: 'absolute', left: 8, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 8, zIndex: 11 },
  backArrow: { fontSize: 26, color: '#111111', fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111111', textAlign: 'center' },
  searchBox: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, fontSize: 15, color: '#111827', height: 36, padding: 0 },
  clearBtn: { color: '#9CA3AF', fontSize: 16, padding: 4 },
  geoBtn: { fontSize: 18, padding: 4 },
  suggestions: { marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  suggestionIcon: { fontSize: 14 },
  suggestionText: { flex: 1, fontSize: 14, color: '#374151' },
  datesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  dateBtn: { flex: 1 },
  dateBtnLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  dateBtnValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  datePlaceholder: { color: '#9CA3AF', fontWeight: '400' },
  dateDivider: { width: StyleSheet.hairlineWidth, height: 36, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  guestsInline: { alignItems: 'center' },
  guestsCounter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  cBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#1056E0', justifyContent: 'center', alignItems: 'center' },
  cBtnText: { fontSize: 16, color: '#1056E0', fontWeight: '600', lineHeight: 18 },
  guestsCount: { fontSize: 15, fontWeight: '700', color: '#111827', minWidth: 18, textAlign: 'center' },
  clearDates: { fontSize: 11, color: '#6B7280', marginTop: 8 },
  typeBar: { maxHeight: 44 },
  typeBarContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  typeChipActive: { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  typeChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  typeChipTextActive: { color: '#fff', fontWeight: '700' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  resultCount: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  toolbarActions: { flexDirection: 'row', gap: 8 },
  toolBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  toolBtnActive: { backgroundColor: '#1056E0', borderColor: '#1056E0' },
  toolBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  toolBtnTextActive: { color: '#fff' },
  toolBtnDisabled: { opacity: 0.4 },
  viewToggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#1056E0' },
  viewToggleActive: { backgroundColor: '#1056E0' },
  viewToggleText: { fontSize: 12, color: '#1056E0', fontWeight: '600' },
  viewToggleTextActive: { color: '#fff' },
  list: { padding: 16, gap: 14, paddingBottom: 80 },
  listCard: { width: '100%' },
  emptyState: { alignItems: 'center', marginTop: 64, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 14, color: '#6B7280' },
});
