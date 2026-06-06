// RealEstateDocsSection (immobilier) — protected legal documents.
// Documents are locked until the user expresses interest / contacts the owner.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Property } from '@/types/property';
import { documentsFor } from '../detailContent';

interface Props { property: Property; color?: string; }

export function RealEstateDocsSection({ property, color = '#059669' }: Props) {
  const docs = useMemo(() => documentsFor(property), [property]);

  return (
    <View style={styles.wrap}>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          🔒 Documents protégés — les originaux sont consultables après prise de contact avec le responsable.
        </Text>
      </View>
      {docs.map(d => (
        <View key={d.id} style={styles.row}>
          <Text style={styles.icon}>{d.icon}</Text>
          <Text style={styles.label}>{d.label}</Text>
          {d.verified ? (
            <View style={[styles.badge, { backgroundColor: color }]}>
              <Text style={styles.badgeText}>✓ Vérifié</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgePending]}>
              <Text style={[styles.badgeText, { color: '#92400E' }]}>En vérification</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  notice: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, marginBottom: 4 },
  noticeText: { fontSize: 12.5, color: '#4B5563', lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  icon: { fontSize: 18, width: 26 },
  label: { fontSize: 14, color: '#111827', fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
