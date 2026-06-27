// Page « Restaurants » côté client : affiche les MENUS (plats validés) et les
// TABLES du restaurant — pas la fiche propriété. Le client peut commander un plat
// ou réserver une table. Robuste contre les données manquantes (pas de crash).
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ClientScreenProps } from '../../../navigation/types';
import { propertiesApi } from '../../../services/api/endpoints/properties';
import { restaurantApi } from '../../../services/api/endpoints/restaurantApi';
import { useCurrency } from '../../../hooks/useCurrency';
import { RestaurantReservationModal } from '../PropertyDetail/components/RestaurantReservationModal';

const PRIMARY = '#DC2626';
type Props = ClientScreenProps<'RestaurantMenu'>;

interface Resto { id: string; name?: string; title?: string; city?: string; capacity?: number; maxGuests?: number; cuisineType?: string; tableReservationEnabled?: boolean }
interface MenuItem { id: string; section: string; name: string; description?: string | null; price: number; photoUrl?: string | null }
interface Table { id: string; name: string; seats: number; location?: string | null; isActive: boolean }

const pickArray = (res: any): any[] => {
  const d = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.properties)) return d.properties;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

export default function RestaurantMenuScreen({ navigation, route }: Props) {
  const { formatPrice } = useCurrency();
  const initialId = route.params?.propertyId ?? null;

  const [restaurants, setRestaurants] = useState<Resto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showReserve, setShowReserve] = useState(false);

  const selected = restaurants.find(r => r.id === selectedId) ?? null;
  const restoName = selected?.title ?? selected?.name ?? 'Restaurant';

  // 1) Résolution du / des restaurant(s)
  const loadRestaurants = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await propertiesApi.search({ propertyType: 'restaurant', limit: 20 });
      const list = pickArray(res) as Resto[];
      setRestaurants(list);
      setSelectedId(prev => prev ?? list[0]?.id ?? null);
      if (!initialId && list.length === 0) setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [initialId]);

  useEffect(() => { loadRestaurants(); }, [loadRestaurants]);

  // 2) Menus + tables du restaurant sélectionné
  const loadMenu = useCallback(async (pid: string) => {
    setMenuLoading(true);
    try {
      const [mRes, tRes] = await Promise.allSettled([
        restaurantApi.getMenuItems(pid),
        restaurantApi.getTables(pid),
      ]);
      setMenus(mRes.status === 'fulfilled' ? (pickArray(mRes.value) as MenuItem[]) : []);
      setTables(tRes.status === 'fulfilled' ? (pickArray(tRes.value) as Table[]).filter(t => t.isActive !== false) : []);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => { if (selectedId) loadMenu(selectedId); }, [selectedId, loadMenu]);

  const sections = [...new Set(menus.map(m => m.section).filter(Boolean))];

  const goOrder = () => {
    if (!selectedId) return;
    navigation.navigate('RestaurantOrderCart', { propertyId: selectedId, propertyName: restoName });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
      </SafeAreaView>
    );
  }

  if (error || !selectedId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <Ionicons name="restaurant-outline" size={44} color="#9CA3AF" />
          <Text style={styles.emptyText}>Aucun restaurant disponible pour le moment.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadRestaurants}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{restoName}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Sélecteur de restaurant si plusieurs */}
        {restaurants.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {restaurants.map(r => {
              const active = r.id === selectedId;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.chip, active && { backgroundColor: PRIMARY, borderColor: PRIMARY }]}
                  onPress={() => setSelectedId(r.id)}
                >
                  <Text style={[styles.chipText, active && { color: '#fff' }]} numberOfLines={1}>
                    {r.title ?? r.name ?? 'Restaurant'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {selected?.city ? <Text style={styles.city}>📍 {selected.city}</Text> : null}

        {/* ── Menus ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>🍽️ Menu</Text>
        {menuLoading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginVertical: 24 }} />
        ) : menus.length === 0 ? (
          <Text style={styles.emptySub}>Le menu de ce restaurant sera bientôt disponible.</Text>
        ) : (
          sections.map(section => (
            <View key={section} style={styles.group}>
              <Text style={styles.catTitle}>{section}</Text>
              {menus.filter(m => m.section === section).map(item => (
                <View key={item.id} style={styles.dish}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.dishImg} />
                  ) : (
                    <View style={[styles.dishImg, styles.dishImgFallback]}><Text style={{ fontSize: 22 }}>🍽️</Text></View>
                  )}
                  <View style={styles.dishInfo}>
                    <Text style={styles.dishName} numberOfLines={1}>{item.name}</Text>
                    {item.description ? <Text style={styles.dishDesc} numberOfLines={2}>{item.description}</Text> : null}
                  </View>
                  <Text style={styles.dishPrice}>{formatPrice(item.price)}</Text>
                </View>
              ))}
            </View>
          ))
        )}

        {/* ── Tables ────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>🪑 Tables disponibles</Text>
        {tables.length === 0 ? (
          <Text style={styles.emptySub}>Réservez une table en choisissant un créneau et le nombre de couverts.</Text>
        ) : (
          <View style={styles.tablesWrap}>
            {tables.map(t => (
              <View key={t.id} style={styles.tableCard}>
                <Ionicons name="restaurant-outline" size={18} color={PRIMARY} />
                <Text style={styles.tableName}>{t.name}</Text>
                <Text style={styles.tableMeta}>{t.seats} couverts{t.location ? ` · ${t.location}` : ''}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Barre d'actions ───────────────────────────────────────── */}
      <View style={styles.footer}>
        {/* « Réserver une table » uniquement si le restaurant l'a activé */}
        {selected?.tableReservationEnabled && (
          <TouchableOpacity style={[styles.footerBtn, styles.reserveBtn]} onPress={() => setShowReserve(true)}>
            <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
            <Text style={[styles.footerBtnText, { color: PRIMARY }]}>Réserver une table</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.footerBtn, styles.orderBtn]} onPress={goOrder} disabled={menus.length === 0}>
          <Ionicons name="cart-outline" size={18} color="#fff" />
          <Text style={[styles.footerBtnText, { color: '#fff' }]}>Commander</Text>
        </TouchableOpacity>
      </View>

      {selected && (
        <RestaurantReservationModal
          visible={showReserve}
          property={selected as never}
          color={PRIMARY}
          onClose={() => setShowReserve(false)}
          onConfirm={(date, time, guests, note) => {
            setShowReserve(false);
            if (!selectedId) return;
            navigation.navigate('Booking', {
              propertyId: selectedId,
              checkIn: date,
              checkOut: date,
              guests,
              propertyName: restoName,
              mode: 'table',
              reservationTime: note ? `${time} — ${note}` : time,
            });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 14 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#9CA3AF', paddingHorizontal: 16, paddingVertical: 8 },
  retryBtn: { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#111827' },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxWidth: 200 },
  chipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  city: { fontSize: 13, color: '#6B7280', paddingHorizontal: 16, marginTop: 8 },
  sectionHeading: { fontSize: 16, fontWeight: '800', color: '#111827', paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },
  group: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  catTitle: { fontSize: 13, fontWeight: '800', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
  dish: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10 },
  dishImg: { width: 60, height: 60, borderRadius: 10 },
  dishImgFallback: { backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  dishInfo: { flex: 1 },
  dishName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  dishDesc: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 16 },
  dishPrice: { fontSize: 14, fontWeight: '800', color: PRIMARY },
  tablesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  tableCard: { width: '47%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 4 },
  tableName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  tableMeta: { fontSize: 12, color: '#6B7280' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 14, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  reserveBtn: { borderWidth: 1.5, borderColor: PRIMARY, backgroundColor: '#fff' },
  orderBtn: { backgroundColor: PRIMARY },
  footerBtnText: { fontSize: 15, fontWeight: '700' },
});
