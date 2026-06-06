// NearbySection — points of interest around the property (commerces, transports, attractions).
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Property, NearbyPlace } from '@/types/property';
import { nearbyFor } from '../detailContent';

interface Props { property: Property; color?: string; }

const FILTERS: { key: NearbyPlace['category'] | 'all'; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'commerce', label: '🛒 Commerces' },
  { key: 'transport', label: '🚌 Transports' },
  { key: 'attraction', label: '🏖️ Attractions' },
];

export function NearbySection({ property, color = '#1056E0' }: Props) {
  const places = useMemo(() => nearbyFor(property), [property]);
  const [filter, setFilter] = useState<NearbyPlace['category'] | 'all'>('all');

  const visible = filter === 'all' ? places : places.filter(p => p.category === filter);

  return (
    <View style={styles.wrap}>
      <View style={styles.filters}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.chipText, active && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.list}>
        {visible.map(p => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.icon}>{p.icon}</Text>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={[styles.distance, { color }]}>{p.distance}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12.5, color: '#374151', fontWeight: '600' },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  icon: { fontSize: 18, width: 24 },
  name: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  distance: { fontSize: 13, fontWeight: '700' },
});
