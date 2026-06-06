import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Property } from '@/types/property';
import { characteristicsFor } from '../detailContent';

interface Props { property: Property; }

// Main characteristics — adapted per property type (hébergement, hôtel,
// restaurant, immobilier) via characteristicsFor().
export function CharacteristicsSection({ property }: Props) {
  const items = useMemo(() => characteristicsFor(property), [property]);
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {items.map((it, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.icon}>{it.icon}</Text>
            <Text style={styles.value} numberOfLines={1}>{it.value}</Text>
            <Text style={styles.label} numberOfLines={1}>{it.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  item: { flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 4, gap: 4 },
  icon: { fontSize: 22 },
  value: { fontSize: 17, fontWeight: '800', color: '#111827' },
  label: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
});
