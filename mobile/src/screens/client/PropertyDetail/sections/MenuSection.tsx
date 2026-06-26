// MenuSection (restaurant) — menu items grouped by category, with photo + price.
// Affiche les vrais plats VALIDÉS (API) ; repli sur un menu indicatif si aucun.
import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { Property } from '@/types/property';
import { useCurrency } from '../../../../hooks/useCurrency';
import { menuFor } from '../detailContent';
import { restaurantApi } from '../../../../services/api/endpoints/restaurantApi';

interface Props { property: Property; color?: string; }

export function MenuSection({ property, color = '#DC2626' }: Props) {
  const { formatPrice } = useCurrency();
  const [apiItems, setApiItems] = useState<any[] | null>(null);

  useEffect(() => {
    let alive = true;
    if (!property?.id) return;
    restaurantApi.getMenuItems(property.id)
      .then((res) => { if (alive) setApiItems((res.data as any)?.data ?? []); })
      .catch(() => { if (alive) setApiItems([]); });
    return () => { alive = false; };
  }, [property?.id]);

  const staticItems = useMemo(() => menuFor(property), [property]);
  const items = useMemo(() => {
    if (apiItems && apiItems.length > 0) {
      return apiItems.map((i) => ({
        id: i.id, category: i.section, name: i.name,
        description: i.description, price: i.price, imageUrl: i.photoUrl,
      })) as typeof staticItems;
    }
    return staticItems;
  }, [apiItems, staticItems]);

  // Group by category, preserving insertion order
  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const it of items) {
      const cat = it.category ?? 'Menu';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <View style={styles.wrap}>
      {groups.map(([cat, list]) => (
        <View key={cat} style={styles.group}>
          <Text style={[styles.catTitle, { color }]}>{cat}</Text>
          {list.map(item => (
            <View key={item.id} style={styles.item}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.img} />
              ) : (
                <View style={[styles.img, styles.imgFallback]}><Text style={styles.imgFallbackText}>🍽️</Text></View>
              )}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
              </View>
              <Text style={[styles.price, { color }]}>{formatPrice(item.price)}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 12, gap: 14 },
  group: { gap: 10 },
  catTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10 },
  img: { width: 56, height: 56, borderRadius: 10 },
  imgFallback: { backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  imgFallbackText: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#111827' },
  desc: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 16 },
  price: { fontSize: 14, fontWeight: '800' },
});
