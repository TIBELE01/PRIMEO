// FAQSection — type-aware questions & answers with per-item expand/collapse.
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import type { Property } from '@/types/property';
import { faqFor } from '../detailContent';

interface Props { property: Property; color?: string; }

export function FAQSection({ property, color = '#1056E0' }: Props) {
  const items = useMemo(() => faqFor(property), [property]);
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(160, 'easeInEaseOut', 'opacity'));
    setOpenId(cur => (cur === id ? null : id));
  };

  return (
    <View style={styles.wrap}>
      {items.map(item => {
        const open = openId === item.id;
        return (
          <TouchableOpacity key={item.id} style={styles.item} onPress={() => toggle(item.id)} activeOpacity={0.7}>
            <View style={styles.qRow}>
              <Text style={styles.q}>{item.question}</Text>
              <Text style={[styles.sign, { color }]}>{open ? '−' : '+'}</Text>
            </View>
            {open && <Text style={styles.a}>{item.answer}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  item: { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  qRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  q: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  sign: { fontSize: 20, fontWeight: '700', width: 20, textAlign: 'center' },
  a: { fontSize: 13, color: '#4B5563', lineHeight: 20, marginTop: 8 },
});
