// Page de catégorie avec recherche avancée intégrée :
// autocomplétion Geoapify, géolocalisation, calendrier visuel avec prix,
// sélecteur de voyageurs/convives, filtres complets par type et carte interactive.
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ActivityIndicator, ScrollView, Modal,
  ImageBackground, Dimensions, Platform, Animated, LayoutAnimation,
  UIManager,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '@navigation/types';
import { propertiesApi } from '@services/api/endpoints/properties';
import type { Property } from '@/types/property';
import { normalizeProperties } from '@/utils/normalizeProperty';
import { useDebounce } from '@hooks/useDebounce';
import { PropertyCard } from '../Home/PropertyCard';
import { SearchMapView } from '../Search/MapView';
import { CategoryFilterSheet, countActive, type FilterState } from './CategoryFilterSheet';
import { CATEGORY_CONFIGS, type CategoryConfig, type CategoryKey } from './categoryConfig';
import { GeoSearchInput } from '@components/search/GeoSearchInput';
import { GuestPicker } from '@components/search/GuestPicker';
import { CalendarPickerModal } from '../PropertyDetail/components/CalendarPickerModal';

// Activer les animations LayoutAnimation sur Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Nav = NativeStackNavigationProp<ClientStackParamList>;

const SCREEN_W = Dimensions.get('window').width;
const CAROUSEL_CARD_W = 200;
const CAROUSEL_CARD_H = 160;
const GRID_CARD_W = (SCREEN_W - 48) / 2;

// ── Carousel item ─────────────────────────────────────────────────────────────

function CarouselCard({ item, color, onPress }: { item: Property; color: string; onPress: () => void }) {
  const price = item.pricePerNight ?? item.priceForSale ?? 0;
  return (
    <TouchableOpacity style={[cst.card, { width: CAROUSEL_CARD_W }]} onPress={onPress} activeOpacity={0.88}>
      <ImageBackground
        source={{ uri: item.images?.[0]?.url }}
        style={cst.cardImg}
        imageStyle={{ borderRadius: 14 }}
      >
        <View style={cst.cardOverlay} />
        {item.isBoosted && <View style={[cst.cardBadge, { backgroundColor: color }]}><Text style={cst.cardBadgeText}>★ Promo</Text></View>}
        {item.isSuperHost && <View style={[cst.cardBadge, { backgroundColor: '#F59E0B', top: item.isBoosted ? 36 : 8 }]}><Text style={cst.cardBadgeText}>⭐ Top</Text></View>}
      </ImageBackground>
      <View style={cst.cardInfo}>
        <Text style={cst.cardTitle} numberOfLines={1}>{item.name}</Text>
        <View style={cst.cardRow}>
          <Text style={[cst.cardPrice, { color }]}>
            {price > 0 ? `${price.toLocaleString('fr-FR')} F` : '—'}
          </Text>
          <Text style={cst.cardRating}>★ {(Number(item.rating) || 0).toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cst = StyleSheet.create({
  card: { marginRight: 12, backgroundColor: '#fff', borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  cardImg: { width: '100%', height: CAROUSEL_CARD_H, borderRadius: 14, overflow: 'hidden' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.18)' },
  cardBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  cardBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 13, fontWeight: '800' },
  cardRating: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
});

// ── Carousel auto-scroll ──────────────────────────────────────────────────────

function AutoCarousel({ items, color, onPress, delay = 3000 }: {
  items: Property[]; color: string; onPress: (id: string) => void; delay?: number;
}) {
  const ref = useRef<ScrollView>(null);
  const idx = useRef(0);
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => {
      idx.current = (idx.current + 1) % items.length;
      ref.current?.scrollTo({ x: idx.current * (CAROUSEL_CARD_W + 12), animated: true });
    }, delay);
    return () => clearInterval(t);
  }, [items.length, delay]);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}>
      {items.map(item => (
        <CarouselCard key={item.id} item={item} color={color} onPress={() => onPress(item.id)} />
      ))}
    </ScrollView>
  );
}

// ── Construction des paramètres API ──────────────────────────────────────────

function buildApiParams(
  state: FilterState,
  config: CategoryConfig,
  sortBy: string,
  page: number,
  city: string,
  checkIn: string,
  checkOut: string,
  guests: number,
) {
  // Le backend attend "propertyType" avec les valeurs de l'enum DB
  const p: Record<string, unknown> = { propertyType: config.apiType, sortBy, page, limit: 20 };

  if (city.trim()) p.city = city.trim();
  if (config.showDates) {
    if (checkIn)  p.checkIn  = checkIn;
    if (checkOut) p.checkOut = checkOut;
  }
  // Pour les hébergements : filtrer par capacité minimum
  if (guests > 1 && (config.key === 'residence' || config.key === 'hotel')) {
    p.minCapacity = guests;
  }
  // Pour les restaurants : filtrer par capacité convives
  if (guests > 1 && config.key === 'restaurant') {
    p.minCapacity = guests;
  }

  for (const f of config.filters) {
    const v = state[f.id];
    if (v == null) continue;
    if (f.type === 'range') {
      if (f.id === 'price')  { if (v.min) p.minPrice = Number(v.min); if (v.max) p.maxPrice = Number(v.max); }
      else if (f.id === 'area') { if (v.min) p.minArea = Number(v.min); if (v.max) p.maxArea = Number(v.max); }
      else { if (v.min) p[`${f.id}Min`] = Number(v.min); if (v.max) p[`${f.id}Max`] = Number(v.max); }
    } else if (f.type === 'multi') {
      if (Array.isArray(v) && v.length) p[f.id] = v.join(',');
    } else if (v !== '') {
      p[f.id] = v;
    }
  }
  return p;
}

// ── Filtre côté client (données démo) ────────────────────────────────────────

function filterDemo(demo: Property[], state: FilterState, config: CategoryConfig, city: string): Property[] {
  return demo.filter(p => {
    // Filtre ville
    if (city.trim() && !p.city.toLowerCase().includes(city.trim().toLowerCase())) return false;
    for (const f of config.filters) {
      const v = state[f.id];
      if (v == null) continue;
      const price = p.pricePerNight ?? p.priceForSale ?? 0;
      if (f.id === 'price' && f.type === 'range') {
        if (v.min && price < Number(v.min)) return false;
        if (v.max && price > Number(v.max)) return false;
      } else if (f.id === 'area' && f.type === 'range') {
        const a = (p as any).area ?? 0;
        if (v.min && a < Number(v.min)) return false;
        if (v.max && a > Number(v.max)) return false;
      } else if (f.id === 'minRating') {
        if (p.rating < Number(v)) return false;
      } else if (f.id === 'bedrooms') {
        const b = (p as any).bedrooms ?? 0;
        if (v === '4' ? b < 4 : b !== Number(v)) return false;
      } else if (f.id === 'badges' && Array.isArray(v)) {
        if (v.includes('virtual_tour') && !p.virtualTour?.available) return false;
        if (v.includes('super_host') && !p.isSuperHost) return false;
      } else if (f.id === 'promo' && Array.isArray(v) && v.length) {
        if (!p.isBoosted) return false;
      }
    }
    return true;
  });
}

function sortProps(list: Property[], sortBy: string): Property[] {
  const a = [...list];
  const price = (p: Property) => p.pricePerNight ?? p.priceForSale ?? 0;
  if (sortBy === 'price_asc')  a.sort((x, y) => price(x) - price(y));
  else if (sortBy === 'price_desc') a.sort((x, y) => price(y) - price(x));
  else if (sortBy === 'rating')     a.sort((x, y) => y.rating - x.rating);
  else if (sortBy === 'newest')     a.sort((x, y) => y.reviewCount - x.reviewCount);
  return a;
}

// ── Chips filtres actifs ──────────────────────────────────────────────────────

interface Chip { id: string; label: string; clear: () => void }

function buildChips(state: FilterState, config: CategoryConfig, patch: (fn: (s: FilterState) => FilterState) => void): Chip[] {
  const chips: Chip[] = [];
  const fmt = (n: string) => Number(n).toLocaleString('fr-FR');
  for (const f of config.filters) {
    const v = state[f.id];
    if (v == null) continue;
    const prefix = f.chipPrefix ?? f.label;
    if (f.type === 'range') {
      if (!v.min && !v.max) continue;
      const part = v.min && v.max ? `${fmt(v.min)}–${fmt(v.max)}` : v.min ? `≥ ${fmt(v.min)}` : `≤ ${fmt(v.max)}`;
      chips.push({ id: f.id, label: `${prefix}: ${part}${f.unit ? ' ' + f.unit : ''}`, clear: () => patch(s => ({ ...s, [f.id]: undefined })) });
    } else if (f.type === 'multi') {
      if (!Array.isArray(v) || !v.length) continue;
      for (const val of v) {
        const opt = f.options?.find(o => o.value === val);
        chips.push({ id: `${f.id}:${val}`, label: opt?.label ?? val, clear: () => patch(s => ({ ...s, [f.id]: (s[f.id] as string[]).filter(x => x !== val) })) });
      }
    } else if (v !== '') {
      const opt = f.options?.find(o => o.value === v);
      chips.push({ id: f.id, label: `${prefix}: ${opt?.label ?? v}`, clear: () => patch(s => ({ ...s, [f.id]: undefined })) });
    }
  }
  return chips;
}

// ── Panneau de recherche (collapsible) ───────────────────────────────────────

const MONTHS_SHORT = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
function fmtShort(str: string): string {
  if (!str) return '—';
  const [, m, d] = str.split('-');
  return `${parseInt(d, 10)} ${MONTHS_SHORT[parseInt(m, 10) - 1]}`;
}
function nightsBetween(ci: string, co: string): number {
  return Math.max(1, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000));
}

interface SearchPanelProps {
  config: CategoryConfig;
  city: string;
  onCityChange: (c: string) => void;
  checkIn: string;
  checkOut: string;
  onCheckInChange: (d: string) => void;
  onCheckOutChange: (d: string) => void;
  guests: number;
  onGuestsChange: (n: number) => void;
  pricePerNight?: number | null;
  onSearch: () => void;
}

function SearchPanel({
  config, city, onCityChange, checkIn, checkOut,
  onCheckInChange, onCheckOutChange, guests, onGuestsChange,
  pricePerNight, onSearch,
}: SearchPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [calMode, setCalMode] = useState<'checkin' | 'checkout' | null>(null);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };

  const hasSearch = !!city || !!checkIn || !!checkOut || guests > 1;

  // Label résumé pour la barre collapsed
  const summaryParts: string[] = [];
  if (city) summaryParts.push(city);
  if (checkIn && checkOut) summaryParts.push(`${checkIn.slice(5)} → ${checkOut.slice(5)}`);
  else if (checkIn) summaryParts.push(`Arrivée ${checkIn.slice(5)}`);
  if (guests > 1) summaryParts.push(`${guests} pers.`);
  const summary = summaryParts.join(' · ') || 'Destination, dates, voyageurs…';

  const showGuests = config.key !== 'immobilier';
  const guestLabel = config.key === 'restaurant' ? 'Convives' : 'Voyageurs';
  const guestIcon = config.key === 'restaurant' ? '🍽️' : '👥';
  const guestMax = config.key === 'restaurant' ? 20 : 12;

  return (
    <View style={sp.wrap}>
      {/* Barre résumé (toujours visible) */}
      <TouchableOpacity style={[sp.bar, { borderColor: hasSearch ? config.color : '#E5E7EB' }]} onPress={toggle} activeOpacity={0.85}>
        <Text style={sp.barIcon}>🔍</Text>
        <Text style={[sp.barSummary, hasSearch && { color: '#111827', fontWeight: '600' }]} numberOfLines={1}>
          {summary}
        </Text>
        <Text style={[sp.barArrow, { color: config.color }]}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Panneau dépliable */}
      {expanded && (
        <View style={sp.panel}>
          {/* Destination */}
          <View style={sp.section}>
            <Text style={sp.sectionLabel}>Destination</Text>
            <GeoSearchInput
              value={city}
              onChange={onCityChange}
              onSelectCity={c => { onCityChange(c); }}
              color={config.color}
              placeholder="Ville, quartier…"
            />
          </View>

          {/* Dates (pour les catégories avec showDates) */}
          {config.showDates && (
            <View style={sp.section}>
              <Text style={sp.sectionLabel}>
                {config.key === 'restaurant' ? 'Date de réservation' : 'Dates de séjour'}
              </Text>
              <View style={sp.dateRow}>
                <TouchableOpacity
                  style={[sp.dateField, sp.dateFieldLeft]}
                  onPress={() => setCalMode('checkin')}
                  activeOpacity={0.7}
                >
                  <Text style={sp.dateFieldLabel}>
                    {config.key === 'restaurant' ? 'Date' : 'Arrivée'}
                  </Text>
                  <Text style={checkIn ? sp.dateFieldValue : sp.dateFieldPlaceholder}>
                    {checkIn ? fmtShort(checkIn) : 'Choisir'}
                  </Text>
                </TouchableOpacity>

                {config.key !== 'restaurant' && (
                  <>
                    <View style={sp.dateDivider} />
                    <TouchableOpacity
                      style={[sp.dateField, sp.dateFieldRight]}
                      onPress={() => setCalMode('checkout')}
                      activeOpacity={0.7}
                    >
                      <Text style={sp.dateFieldLabel}>Départ</Text>
                      <Text style={checkOut ? sp.dateFieldValue : sp.dateFieldPlaceholder}>
                        {checkOut ? fmtShort(checkOut) : 'Choisir'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {checkIn && checkOut && config.key !== 'restaurant' && (
                <View style={[sp.dateRecap, { borderColor: config.color + '40' }]}>
                  <Text style={[sp.dateRecapText, { color: config.color }]}>
                    {nightsBetween(checkIn, checkOut)} nuit(s)
                  </Text>
                  <TouchableOpacity onPress={() => { onCheckInChange(''); onCheckOutChange(''); }}>
                    <Text style={sp.dateClear}>Effacer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Voyageurs / convives */}
          {showGuests && (
            <View style={[sp.section, sp.sectionDivider]}>
              <Text style={sp.sectionLabel}>{guestLabel}</Text>
              <GuestPicker
                value={guests}
                onChange={onGuestsChange}
                min={1}
                max={guestMax}
                label={guestLabel}
                icon={guestIcon}
                color={config.color}
              />
            </View>
          )}

          {/* Bouton Rechercher */}
          <TouchableOpacity
            style={[sp.searchBtn, { backgroundColor: config.color }]}
            onPress={() => { toggle(); onSearch(); }}
            activeOpacity={0.88}
          >
            <Text style={sp.searchBtnText}>🔍 Rechercher</Text>
          </TouchableOpacity>

          {/* Réinitialiser */}
          {hasSearch && (
            <TouchableOpacity
              style={sp.resetBtn}
              onPress={() => {
                onCityChange('');
                onCheckInChange('');
                onCheckOutChange('');
                onGuestsChange(1);
                toggle();
                onSearch();
              }}
            >
              <Text style={sp.resetBtnText}>Réinitialiser la recherche</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <CalendarPickerModal
        visible={calMode !== null}
        color={config.color}
        mode={calMode === 'checkout' ? 'checkout' : config.key === 'restaurant' ? 'single' : 'checkin'}
        existingCheckIn={calMode === 'checkout' ? checkIn : undefined}
        onConfirm={(date) => {
          if (calMode === 'checkin') {
            onCheckInChange(date);
            onCheckOutChange('');
          } else if (calMode === 'checkout') {
            onCheckOutChange(date);
          } else {
            onCheckInChange(date);
          }
          setCalMode(null);
        }}
        onClose={() => setCalMode(null)}
      />
    </View>
  );
}

const sp = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 8 },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 13,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 14,
  },
  barIcon: { fontSize: 16 },
  barSummary: { flex: 1, fontSize: 13, color: '#9CA3AF', fontWeight: '400' },
  barArrow: { fontSize: 12, fontWeight: '700' },
  panel: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 0,
    marginTop: 6, padding: 16, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 16,
  },
  section: { gap: 8 },
  sectionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6', paddingTop: 16 },
  sectionLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  /* Date picker */
  dateRow: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  dateField: { flex: 1, paddingVertical: 11, paddingHorizontal: 14 },
  dateFieldLeft: {},
  dateFieldRight: {},
  dateDivider: { width: 1, backgroundColor: '#E5E7EB' },
  dateFieldLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  dateFieldValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  dateFieldPlaceholder: { fontSize: 13, color: '#D1D5DB', fontWeight: '500' },
  dateRecap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginTop: 4 },
  dateRecapText: { fontSize: 12, fontWeight: '600' },
  dateClear: { fontSize: 12, color: '#DC2626', fontWeight: '600' },

  searchBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  resetBtn: { alignItems: 'center' },
  resetBtnText: { fontSize: 13, color: '#6B7280', textDecorationLine: 'underline' },
});

// ── Écran principal ───────────────────────────────────────────────────────────

export function CategoryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const categoryKey: CategoryKey = route.params?.category ?? 'residence';
  const config = CATEGORY_CONFIGS[categoryKey];

  // Filtres avancés (sheet)
  const [filters, setFilters] = useState<FilterState>({});
  const [sortBy, setSortBy] = useState<string>(config.sortOptions[0].key);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Recherche avancée (panneau)
  const [searchCity, setSearchCity] = useState('');
  const [checkIn, setCheckIn]       = useState('');
  const [checkOut, setCheckOut]     = useState('');
  const [guests, setGuests]         = useState(1);

  // Résultats
  const [results, setResults] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  // UI
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [searchVersion, setSearchVersion] = useState(0);

  const debouncedFilters = useDebounce(filters, 300);

  // Prix par nuit moyen des résultats courants (pour afficher dans le calendrier)
  const avgPricePerNight = useMemo(() => {
    const withPrice = results.filter(p => p.pricePerNight != null);
    if (!withPrice.length) return null;
    return Math.round(withPrice.reduce((s, p) => s + p.pricePerNight!, 0) / withPrice.length);
  }, [results]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = buildApiParams(filters, config, sortBy, p, searchCity, checkIn, checkOut, guests);
      const res = await propertiesApi.search(params);
      const data = (res.data as any)?.data;
      const items = normalizeProperties(data?.properties ?? data ?? []);
      if (items.length === 0 && p === 1) {
        const demo = sortProps(filterDemo(config.demo, filters, config, searchCity), sortBy);
        setUsingDemo(true);
        setResults(demo);
        setTotal(demo.length);
        setPage(1);
      } else {
        setUsingDemo(false);
        setResults(prev => p === 1 ? items : [...prev, ...items]);
        setTotal(data?.total ?? items.length);
        setPage(p);
      }
    } catch {
      const demo = sortProps(filterDemo(config.demo, filters, config, searchCity), sortBy);
      setUsingDemo(true);
      setResults(demo);
      setTotal(demo.length);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, config, searchCity, checkIn, checkOut, guests]);

  // Recharger quand les filtres de la sheet changent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(1); }, [debouncedFilters, sortBy]);

  // Recharger quand le bouton "Rechercher" du panneau est cliqué
  useEffect(() => {
    if (searchVersion > 0) load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchVersion]);

  const patch = useCallback((fn: (s: FilterState) => FilterState) => setFilters(fn), []);
  const chips = useMemo(() => buildChips(filters, config, patch), [filters, config, patch]);
  const activeCount = countActive(filters, config);

  const goProperty = (id: string) => navigation.navigate('PropertyDetail', { propertyId: id });
  const loadMore = () => { if (!loading && !usingDemo && results.length < total) load(page + 1); };

  // Carousels
  const pourVous = useMemo(() => {
    const base = usingDemo || results.length === 0 ? config.demo : results;
    return [...base].sort((a, b) => b.rating - a.rating).slice(0, 10);
  }, [results, usingDemo, config.demo]);

  const nouveautes = useMemo(() => {
    const base = usingDemo || results.length === 0 ? config.demo : results;
    return [...base].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 10);
  }, [results, usingDemo, config.demo]);

  // ── ListHeader ─────────────────────────────────────────────────────────────

  const ListHeader = useMemo(() => (
    <View>
      {/* Hero */}
      <ImageBackground source={{ uri: config.heroImage }} style={st.hero} resizeMode="cover">
        <View style={[st.heroGrad1, { backgroundColor: config.colorDark }]} />
        <View style={st.heroGrad2} />
        <SafeAreaView style={st.heroSafe}>
          <View style={st.heroTopBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={st.backCircle} hitSlop={12}>
              <Text style={st.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={st.heroCenter}>
              <Text style={st.heroIcon}>{config.icon}</Text>
              <Text style={st.heroTitle}>{config.title}</Text>
            </View>
            <TouchableOpacity
              style={[st.viewToggle, viewMode === 'map' && st.viewToggleActive]}
              onPress={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
            >
              <Text style={[st.viewToggleText, viewMode === 'map' && { color: config.color }]}>
                {viewMode === 'list' ? '🗺' : '☰'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={st.heroTaglineWrap}>
            <Text style={st.heroTagline}>{config.tagline}</Text>
          </View>
          <View style={st.heroBar}>
            <View style={st.countWrap}>
              <Text style={st.count}>{loading ? '…' : `${total} résultat${total !== 1 ? 's' : ''}`}</Text>
              {usingDemo && <View style={st.demoBadge}><Text style={st.demoBadgeText}>DÉMO</Text></View>}
            </View>
            <TouchableOpacity style={st.sortBtn} onPress={() => setShowSort(true)}>
              <Text style={st.sortBtnText}>↕ {config.sortOptions.find(o => o.key === sortBy)?.label}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* Panneau de recherche avancée */}
      <View style={st.searchWrap}>
        <SearchPanel
          config={config}
          city={searchCity}
          onCityChange={setSearchCity}
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
          guests={guests}
          onGuestsChange={setGuests}
          pricePerNight={avgPricePerNight}
          onSearch={() => setSearchVersion(v => v + 1)}
        />
      </View>

      {/* Chips filtres actifs */}
      {chips.length > 0 && (
        <View style={st.chipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipsRow}>
            {chips.map(c => (
              <TouchableOpacity key={c.id} style={[st.activeChip, { borderColor: config.color }]} onPress={c.clear}>
                <Text style={[st.activeChipText, { color: config.color }]}>{c.label}</Text>
                <Text style={[st.activeChipX, { color: config.color }]}>✕</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={st.clearAll} onPress={() => setFilters({})}>
              <Text style={st.clearAllText}>Tout effacer</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Carousel "Pour vous" */}
      <View style={st.sectionWrap}>
        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>Pour vous</Text>
          <View style={[st.sectionAccent, { backgroundColor: config.color }]} />
        </View>
        <Text style={st.sectionSubtitle}>Sélectionnés selon vos préférences</Text>
        <AutoCarousel items={pourVous} color={config.color} onPress={goProperty} delay={3200} />
      </View>

      {/* Carousel "Nouveautés" */}
      <View style={st.sectionWrap}>
        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>Nouveautés</Text>
          <View style={[st.sectionAccent, { backgroundColor: config.color }]} />
        </View>
        <Text style={st.sectionSubtitle}>Les derniers biens disponibles</Text>
        <AutoCarousel items={nouveautes} color={config.color} onPress={goProperty} delay={2800} />
      </View>

      {/* Titre grille */}
      <View style={st.gridHeader}>
        <Text style={st.gridTitle}>Tous les biens</Text>
        <Text style={st.gridCount}>{total} résultat{total !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [config, chips, total, usingDemo, loading, sortBy, viewMode, pourVous, nouveautes, searchCity, checkIn, checkOut, guests, avgPricePerNight]);

  return (
    <View style={[st.safe, { backgroundColor: config.colorSoft }]}>
      <StatusBar barStyle="light-content" backgroundColor={config.colorDark} translucent />

      {viewMode === 'map' ? (
        <View style={st.mapWrap}>
          <SearchMapView properties={results} onMarkerPress={goProperty} color={config.color} />
          <View style={[st.mapBar, { backgroundColor: config.color }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
              <Text style={st.mapBack}>← {config.title}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode('list')}>
              <Text style={st.mapToggle}>☰ Liste</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={p => p.id}
          numColumns={2}
          contentContainerStyle={st.gridContent}
          columnWrapperStyle={st.gridRow}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <TouchableOpacity style={st.gridCard} onPress={() => goProperty(item.id)} activeOpacity={0.9}>
              <PropertyCard property={item} onPress={() => goProperty(item.id)} style={{ width: GRID_CARD_W }} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={config.color} style={{ marginTop: 40 }} />
            ) : (
              <View style={st.empty}>
                <Text style={st.emptyIcon}>{config.icon}</Text>
                <Text style={st.emptyTitle}>Aucun résultat</Text>
                <Text style={st.emptyText}>Essayez d'élargir vos filtres ou votre recherche.</Text>
              </View>
            )
          }
          ListFooterComponent={
            loading && results.length > 0
              ? <ActivityIndicator color={config.color} style={{ marginVertical: 20 }} />
              : <View style={{ height: 100 }} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
        />
      )}

      {/* Bouton flottant filtres */}
      <TouchableOpacity
        style={[st.fab, { backgroundColor: config.color }]}
        onPress={() => setShowFilter(true)}
        activeOpacity={0.88}
      >
        <Text style={st.fabText}>
          ⚙ Filtres{activeCount > 0 ? ` · ${activeCount}` : ''}
        </Text>
      </TouchableOpacity>

      {/* Sheet filtres */}
      <CategoryFilterSheet
        visible={showFilter}
        config={config}
        values={filters}
        onClose={() => setShowFilter(false)}
        onApply={vals => { setFilters(vals); setShowFilter(false); }}
        onReset={() => { setFilters({}); setShowFilter(false); }}
      />

      {/* Sheet tri */}
      <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
        <TouchableOpacity style={st.sortOverlay} activeOpacity={1} onPress={() => setShowSort(false)}>
          <View style={st.sortSheet}>
            <Text style={st.sortTitle}>Trier par</Text>
            {config.sortOptions.map(o => (
              <TouchableOpacity key={o.key} style={st.sortOpt} onPress={() => { setSortBy(o.key); setShowSort(false); }}>
                <Text style={[st.sortOptText, sortBy === o.key && { color: config.color, fontWeight: '700' }]}>{o.label}</Text>
                {sortBy === o.key && <Text style={[st.sortCheck, { color: config.color }]}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const HERO_H = 240 + (Platform.OS === 'ios' ? 44 : 30);

const st = StyleSheet.create({
  safe: { flex: 1 },
  hero: { width: '100%', height: HERO_H, justifyContent: 'flex-end' },
  heroGrad1: { ...StyleSheet.absoluteFillObject, opacity: 0.55 },
  heroGrad2: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  heroSafe: { flex: 1, justifyContent: 'flex-end', paddingBottom: 18 },
  heroTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 0 : 12, marginBottom: 8 },
  backCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 20, color: '#fff', fontWeight: '300', lineHeight: 24 },
  heroCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroIcon: { fontSize: 26 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  viewToggle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  viewToggleActive: { backgroundColor: '#fff' },
  viewToggleText: { fontSize: 16, color: '#fff' },
  heroTaglineWrap: { paddingHorizontal: 20, marginBottom: 14 },
  heroTagline: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 20, fontStyle: 'italic', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  heroBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  countWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontSize: 14, color: 'rgba(255,255,255,0.95)', fontWeight: '700' },
  demoBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  demoBadgeText: { fontSize: 10, color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
  sortBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  sortBtnText: { fontSize: 12.5, color: '#fff', fontWeight: '700' },
  searchWrap: { paddingTop: 12, paddingBottom: 4 },
  chipsWrap: { paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  chipsRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  activeChipText: { fontSize: 12.5, fontWeight: '700' },
  activeChipX: { fontSize: 11, fontWeight: '700' },
  clearAll: { paddingHorizontal: 10, paddingVertical: 6 },
  clearAllText: { fontSize: 12.5, color: '#6B7280', fontWeight: '600', textDecorationLine: 'underline' },
  sectionWrap: { backgroundColor: '#fff', paddingTop: 20, paddingBottom: 16, marginTop: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  sectionAccent: { width: 6, height: 6, borderRadius: 3 },
  sectionSubtitle: { fontSize: 13, color: '#9CA3AF', paddingHorizontal: 16, marginBottom: 14 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10, backgroundColor: '#F9FAFB' },
  gridTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  gridCount: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  gridContent: { paddingBottom: 110 },
  gridRow: { paddingHorizontal: 16, gap: 16, marginBottom: 16 },
  gridCard: {},
  empty: { alignItems: 'center', marginTop: 48, gap: 8, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  fab: { position: 'absolute', bottom: 24, alignSelf: 'center', paddingHorizontal: 26, paddingVertical: 14, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  mapWrap: { flex: 1 },
  mapBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 38, paddingBottom: 14 },
  mapBack: { color: '#fff', fontSize: 16, fontWeight: '700' },
  mapToggle: { color: '#fff', fontSize: 14, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  sortOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sortSheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 36, gap: 4 },
  sortTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 8 },
  sortOpt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12 },
  sortOptText: { fontSize: 15, color: '#374151' },
  sortCheck: { fontSize: 16, fontWeight: '700' },
});
