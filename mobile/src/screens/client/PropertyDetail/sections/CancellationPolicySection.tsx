// CancellationPolicySection — cancellation / booking conditions, adapted per type.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Property } from '@/types/property';
import { cancellationFor } from '../detailContent';

interface Props { property: Property; color?: string; }

export function CancellationPolicySection({ property, color = '#1056E0' }: Props) {
  const { lines } = useMemo(() => cancellationFor(property), [property]);

  return (
    <View style={styles.wrap}>
      {lines.map((line, i) => (
        <View key={i} style={styles.row}>
          <View style={[styles.bullet, { backgroundColor: color }]} />
          <Text style={styles.text}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  text: { flex: 1, fontSize: 13.5, color: '#374151', lineHeight: 20 },
});
