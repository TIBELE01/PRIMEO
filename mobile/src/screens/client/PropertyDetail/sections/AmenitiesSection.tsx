// Section équipements — grille visuelle avec groupes, toujours affichée
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { PropertyAmenity } from '@/types/property';

interface Props {
  amenities: PropertyAmenity[];
  color?: string;
}

const PREVIEW_COUNT = 8;

function AmenityChip({ item, color }: { item: PropertyAmenity; color: string }) {
  return (
    <View style={styles.chip}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <Text style={styles.label} numberOfLines={2}>{item.name}</Text>
    </View>
  );
}

export function AmenitiesSection({ amenities, color = '#1056E0' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? amenities : amenities.slice(0, PREVIEW_COUNT);
  const hidden = amenities.length - PREVIEW_COUNT;

  if (amenities.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Informations sur les équipements à venir.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {shown.map(a => (
          <AmenityChip key={a.id} item={a} color={color} />
        ))}
      </View>

      {hidden > 0 && (
        <TouchableOpacity
          style={[styles.toggleBtn, { borderColor: color }]}
          onPress={() => setExpanded(e => !e)}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, { color }]}>
            {expanded ? 'Voir moins' : `Voir les ${hidden} équipements supplémentaires`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:       { paddingHorizontal: 16, paddingBottom: 14 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9FAFB', borderRadius: 12,
    paddingVertical: 11, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  iconWrap:   { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  icon:       { fontSize: 17 },
  label:      { flex: 1, fontSize: 12.5, color: '#374151', fontWeight: '500', lineHeight: 17 },
  toggleBtn: {
    marginTop: 14, paddingVertical: 12,
    borderWidth: 1.5, borderRadius: 12, alignItems: 'center',
  },
  toggleText: { fontSize: 13, fontWeight: '700' },
  empty:      { paddingHorizontal: 16, paddingBottom: 14 },
  emptyText:  { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
});
